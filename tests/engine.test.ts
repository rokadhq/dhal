import { describe, expect, it } from "vitest";
import { createDhal } from "../src/engine.js";
import { MemorySignalStore } from "../src/stores/memory-signal-store.js";
import { RedisSignalStore, type RedisSignalLikeClient } from "../src/stores/redis-signal-store.js";
import type { DhalRequest } from "../src/types.js";
import { matchesIpList } from "../src/utils/ip.js";

const logger = { log() {}, warn() {}, error() {} };

function req(overrides: Partial<DhalRequest> = {}): DhalRequest {
  return {
    method: "GET",
    url: "/",
    path: "/",
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "text/html",
      "accept-language": "en-US",
      host: "example.test"
    },
    ip: "203.0.113.10",
    ...overrides
  };
}

describe("Dhal engine", () => {
  it("keeps monitor-mode blocks as wouldBlock decisions", async () => {
    const engine = createDhal({
      configPath: "./missing-dhal-test-config.json",
      logger,
      config: {
        mode: "monitor",
        rateLimit: { enabled: false },
        rules: {
          honeypot: {
            enabled: true,
            paths: ["/.env"]
          }
        },
        observability: { logs: { enabled: false } }
      }
    });

    const decision = await engine.inspect(req({ path: "/.env", url: "/.env" }));
    expect(decision.action).toBe("allow");
    expect(decision.wouldBlock).toBe(true);
    expect(decision.ruleId).toBe("honeypot.triggered");
  });

  it("uses bot false-positive controls before blocking", async () => {
    const engine = createDhal({
      configPath: "./missing-dhal-test-config.json",
      logger,
      config: {
        mode: "block",
        rateLimit: { enabled: false },
        rules: {
          bot: {
            enabled: true,
            scoreThreshold: 45,
            falsePositiveControls: {
              minSignals: 2,
              skipStaticAssets: true,
              ignorePaths: ["/healthz"],
              ignorePrivateIps: false
            }
          },
          honeypot: { enabled: false },
          credentialStuffing: { enabled: false },
          sqli: false,
          xss: false,
          pathTraversal: false,
          badUserAgents: false
        },
        observability: { logs: { enabled: false } }
      }
    });

    const oneSignal = await engine.inspect(req({
      headers: { host: "example.test", "user-agent": "python-requests/2.31", accept: "*/*" }
    }));
    expect(oneSignal.action).toBe("allow");

    const twoSignals = await engine.inspect(req({
      headers: { host: "example.test", "user-agent": "python-requests/2.31" }
    }));
    expect(twoSignals.action).toBe("block");
    expect(twoSignals.ruleId).toBe("bot.suspicious_request");
  });

  it("blocks credential stuffing after recorded failures", async () => {
    const store = new MemorySignalStore();
    const engine = createDhal({
      configPath: "./missing-dhal-test-config.json",
      logger,
      signalStore: store,
      config: {
        mode: "block",
        rateLimit: { enabled: false },
        rules: {
          honeypot: { enabled: false },
          bot: { enabled: false },
          credentialStuffing: {
            enabled: true,
            loginPathPatterns: ["/login"],
            failureStatusCodes: [401],
            windowSeconds: 60,
            maxFailures: 2,
            keyBy: ["ip", "route"]
          }
        },
        observability: { logs: { enabled: false } }
      }
    });

    const login = req({ method: "POST", path: "/login", url: "/login", route: "/login" });
    await engine.recordOutcome(login, { statusCode: 401 });
    await engine.recordOutcome(login, { statusCode: 401 });

    const decision = await engine.inspect(login);
    expect(decision.action).toBe("block");
    expect(decision.ruleId).toBe("credential_stuffing.threshold_exceeded");
  });
});

describe("RedisSignalStore", () => {
  it("records and counts distributed signals", async () => {
    const state = new Map<string, { value: number; expiresAt: number }>();
    const client: RedisSignalLikeClient = {
      incr(key) {
        const existing = state.get(key);
        const next = (existing?.value ?? 0) + 1;
        state.set(key, { value: next, expiresAt: existing?.expiresAt ?? 0 });
        return next;
      },
      pexpire(key, ms) {
        const existing = state.get(key);
        if (existing) existing.expiresAt = Date.now() + ms;
      },
      pttl(key) {
        const existing = state.get(key);
        return existing ? Math.max(0, existing.expiresAt - Date.now()) : -2;
      },
      get(key) {
        return state.get(key)?.value ?? null;
      }
    };

    const store = new RedisSignalStore(client, { prefix: "test:sig" });
    const first = await store.record("ip:203.0.113.10|route:/login", 60);
    const second = await store.record("ip:203.0.113.10|route:/login", 60);
    const count = await store.count("ip:203.0.113.10|route:/login");

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(count.count).toBe(2);
    expect(count.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("Dhal policy controls", () => {
  it("suppresses matching rules without losing audit metadata", async () => {
    const engine = createDhal({
      configPath: "./missing-dhal-test-config.json",
      logger,
      config: {
        mode: "block",
        rateLimit: { enabled: false },
        rules: {
          honeypot: {
            enabled: true,
            paths: ["/.well-known/test-canary"]
          },
          bot: { enabled: false },
          credentialStuffing: { enabled: false },
          sqli: false,
          xss: false,
          pathTraversal: false,
          badUserAgents: false
        },
        policy: {
          suppressions: [{
            id: "known-scanner-window",
            enabled: true,
            ruleId: "honeypot.triggered",
            path: "/.well-known/test-canary",
            reason: "temporary validation scanner",
            expiresAt: "2999-01-01T00:00:00.000Z"
          }]
        },
        observability: { logs: { enabled: false } }
      }
    });

    const decision = await engine.inspect(req({ path: "/.well-known/test-canary", url: "/.well-known/test-canary" }));
    expect(decision.action).toBe("allow");
    expect(decision.wouldBlock).toBe(true);
    expect(decision.meta?.suppressed).toBe(true);
    expect(decision.meta?.suppressionId).toBe("known-scanner-window");
    expect(decision.severity).toBe("critical");
  });

  it("samples allowed requests while still emitting blocked decisions", async () => {
    const events: unknown[] = [];
    const engine = createDhal({
      configPath: "./missing-dhal-test-config.json",
      logger,
      config: {
        mode: "block",
        rateLimit: { enabled: false },
        rules: {
          honeypot: { enabled: true, paths: ["/.env"] },
          bot: { enabled: false },
          credentialStuffing: { enabled: false },
          sqli: false,
          xss: false,
          pathTraversal: false,
          badUserAgents: false
        },
        policy: {
          sampling: {
            enabled: true,
            rate: 0,
            includeBlocked: true,
            includeWouldBlock: true,
            rules: {},
            routes: {}
          }
        },
        observability: { logs: { enabled: false } }
      }
    });

    engine.events.onDecision((event) => events.push(event));
    await engine.inspect(req({ path: "/", url: "/" }));
    await engine.inspect(req({ path: "/.env", url: "/.env" }));

    expect(events).toHaveLength(1);
  });
});


describe("Dhal v0.7 rule quality", () => {
  it("supports IPv4 and IPv6 CIDR matches", () => {
    expect(matchesIpList("203.0.113.7", ["203.0.113.0/24"])).toBe(true);
    expect(matchesIpList("2001:db8:abcd::42", ["2001:db8:abcd::/48"])).toBe(true);
    expect(matchesIpList("2001:db8:beef::42", ["2001:db8:abcd::/48"])).toBe(false);
  });

  it("blocks header anomalies before expensive rules", async () => {
    const engine = createDhal({
      configPath: "./missing-dhal-test-config.json",
      logger,
      config: {
        mode: "block",
        rateLimit: { enabled: false },
        rules: {
          honeypot: { enabled: false },
          bot: { enabled: false },
          credentialStuffing: { enabled: false },
          headers: {
            enabled: true,
            requireHostHeader: true,
            maxHeaderCount: 2,
            maxHeaderBytes: 4096,
            suspiciousHeaders: ["x-original-url"],
            blockConflictingForwardingHeaders: false
          }
        },
        observability: { logs: { enabled: false } }
      }
    });

    const decision = await engine.inspect(req({ headers: { host: "example.test", "x-original-url": "/admin" } }));
    expect(decision.action).toBe("block");
    expect(decision.ruleId).toBe("header.anomaly");
    expect(decision.meta?.confidence).toBeTypeOf("number");
  });

  it("applies positive security controls for JSON APIs", async () => {
    const engine = createDhal({
      configPath: "./missing-dhal-test-config.json",
      logger,
      config: {
        mode: "block",
        rateLimit: { enabled: false },
        rules: {
          honeypot: { enabled: false },
          bot: { enabled: false },
          credentialStuffing: { enabled: false },
          headers: { enabled: false },
          api: {
            enabled: true,
            requireJsonContentType: true,
            allowedContentTypes: ["application/json"],
            methodsWithBody: ["POST"],
            maxJsonDepth: 4,
            maxJsonKeys: 10
          }
        },
        observability: { logs: { enabled: false } }
      }
    });

    const decision = await engine.inspect(req({
      method: "POST",
      path: "/api/users",
      url: "/api/users",
      headers: { host: "example.test", "content-type": "text/plain", "content-length": "12" },
      rawBody: "hello=world"
    }));
    expect(decision.action).toBe("block");
    expect(decision.ruleId).toBe("api.positive_security_violation");
  });

  it("loads rule-pack signatures with confidence metadata", async () => {
    const engine = createDhal({
      configPath: "./missing-dhal-test-config.json",
      logger,
      config: {
        mode: "block",
        rateLimit: { enabled: false },
        rules: {
          packs: ["api"],
          honeypot: { enabled: false },
          bot: { enabled: false },
          credentialStuffing: { enabled: false },
          headers: { enabled: false }
        },
        observability: { logs: { enabled: false } }
      }
    });

    const decision = await engine.inspect(req({ path: "/proxy", url: "/proxy?url=http://169.254.169.254/latest/meta-data" }));
    expect(decision.action).toBe("block");
    expect(decision.ruleId).toBe("signature.ssrf.metadata");
    expect(decision.meta?.confidence).toBeTypeOf("number");
  });
});
