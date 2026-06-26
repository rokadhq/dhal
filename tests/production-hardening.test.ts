import http from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config.js";
import { createDhal } from "../src/engine.js";
import { WebhookDhalTelemetry } from "../src/telemetry/webhook.js";
import type { DhalManagedTelemetry } from "../src/telemetry/lifecycle.js";
import type { DhalRequest, DhalSecurityEvent } from "../src/types.js";

const request: DhalRequest = {
  method: "GET",
  url: "/.env",
  path: "/.env",
  headers: {
    host: "example.test",
    accept: "text/html",
    "user-agent": "Mozilla/5.0"
  },
  ip: "203.0.113.10"
};

const securityEvent: DhalSecurityEvent = {
  eventId: "production-hardening-event",
  timestamp: new Date().toISOString(),
  request: { method: "GET", path: "/.env", ip: "203.0.113.10" },
  decision: {
    action: "block",
    statusCode: 403,
    reason: "Honeypot triggered",
    ruleId: "honeypot.triggered",
    score: 100,
    severity: "critical"
  },
  ruleCategory: "honeypot",
  severity: "critical",
  durationMs: 0.2
};

describe("production runtime hardening", () => {
  it("isolates application event-listener failures from request handling", async () => {
    const warnings: string[] = [];
    let healthyListenerCalls = 0;
    const engine = createDhal({
      configPath: "./missing-production-hardening.json",
      logger: {
        log() {},
        error() {},
        warn(message) { warnings.push(String(message)); }
      },
      config: {
        mode: "monitor",
        rateLimit: { enabled: false },
        observability: { logs: { enabled: false } }
      }
    });

    engine.events.onDecision(() => {
      throw new Error("consumer listener failed");
    });
    engine.events.onDecision(() => {
      healthyListenerCalls += 1;
    });

    const decision = await engine.inspect(request);
    const snapshot = engine.getRuntimeSnapshot();

    expect(decision.action).toBe("allow");
    expect(decision.wouldBlock).toBe(true);
    expect(healthyListenerCalls).toBe(1);
    expect(snapshot.eventListenerErrors).toBe(1);
    expect(warnings.some((message) => message.includes("consumer listener failed"))).toBe(true);
  });

  it("refuses enforcing Redis configuration without a distributed store", () => {
    expect(() => createDhal({
      configPath: "./missing-production-hardening.json",
      logger: { log() {}, warn() {}, error() {} },
      config: {
        mode: "block",
        rateLimit: { enabled: true, store: "redis" },
        observability: { logs: { enabled: false } }
      }
    })).toThrow(/Refusing to start in an enforcing mode/);
  });

  it("refuses enforcing blocking reputation without a provider", () => {
    expect(() => createDhal({
      configPath: "./missing-production-hardening.json",
      logger: { log() {}, warn() {}, error() {} },
      config: {
        mode: "block",
        rateLimit: { enabled: false },
        ip: {
          reputation: {
            enabled: true,
            mode: "blocking",
            apiKeyEnv: "DHAL_TEST_MISSING_REPUTATION_KEY"
          }
        },
        observability: { logs: { enabled: false } }
      }
    })).toThrow(/unavailable blocking control/);
  });

  it("exposes flush, close, and runtime health for managed telemetry", async () => {
    let records = 0;
    let flushes = 0;
    let closes = 0;
    const telemetry: DhalManagedTelemetry = {
      recordDecision() { records += 1; },
      async flush() { flushes += 1; },
      async close() { closes += 1; },
      getHealth() {
        return { pending: 0, delivered: records, failed: 0, dropped: 0, closed: closes > 0 };
      }
    };
    const engine = createDhal({
      configPath: "./missing-production-hardening.json",
      logger: { log() {}, warn() {}, error() {} },
      telemetry,
      config: {
        mode: "block",
        rateLimit: { enabled: false },
        observability: { logs: { enabled: false } }
      }
    });

    const decision = await engine.inspect(request);
    expect(decision.action).toBe("block");
    expect(engine.getRuntimeSnapshot().telemetry?.delivered).toBe(1);

    await engine.flush();
    await engine.close();

    expect(flushes).toBe(1);
    expect(closes).toBe(1);
    expect(engine.getRuntimeSnapshot().closed).toBe(true);
    await expect(engine.inspect(request)).rejects.toThrow(/engine is closed/);
  });

  it("bounds webhook work and drains pending delivery during shutdown", async () => {
    const server = http.createServer((_request, response) => {
      setTimeout(() => {
        response.statusCode = 204;
        response.end();
      }, 40);
    });
    server.listen(0);
    await once(server, "listening");

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP address");
      const telemetry = new WebhookDhalTelemetry({
        ...defaultConfig.observability.webhooks,
        enabled: true,
        urls: [`http://127.0.0.1:${address.port}/events`],
        timeoutMs: 1_000
      }, {
        maxPending: 1,
        defaultFlushTimeoutMs: 1_000
      });

      telemetry.recordDecision(securityEvent);
      telemetry.recordDecision(securityEvent);
      expect(telemetry.getHealth().pending).toBe(1);
      expect(telemetry.getHealth().dropped).toBe(1);

      await telemetry.close();
      expect(telemetry.getHealth()).toEqual({
        pending: 0,
        delivered: 1,
        failed: 0,
        dropped: 1,
        closed: true
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
