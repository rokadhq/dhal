import { describe, expect, it } from "vitest";
import { createDhal } from "../src/engine.js";
import { dhalHonoFromEngine, type DhalHonoContext } from "../src/adapters/hono.js";
import { dhalKoaFromEngine, type DhalKoaContext } from "../src/adapters/koa.js";

const protectionConfig = {
  mode: "block" as const,
  rateLimit: { enabled: false },
  rules: {
    honeypot: { enabled: true, paths: ["/.env"] },
    bot: { enabled: false },
    credentialStuffing: { enabled: false }
  },
  observability: { logs: { enabled: false } }
};

describe("Koa adapter", () => {
  it("blocks matching requests without invoking downstream middleware", async () => {
    const engine = createDhal({ config: protectionConfig });
    const middleware = dhalKoaFromEngine(engine);
    const responseHeaders = new Map<string, string>();
    let downstreamCalled = false;

    const context: DhalKoaContext = {
      method: "GET",
      url: "/.env",
      path: "/.env",
      headers: { host: "example.test", "user-agent": "vitest" },
      ip: "203.0.113.10",
      status: 200,
      set: (name, value) => responseHeaders.set(name.toLowerCase(), value)
    };

    try {
      await middleware(context, async () => {
        downstreamCalled = true;
      });

      expect(downstreamCalled).toBe(false);
      expect(context.status).toBe(403);
      expect(responseHeaders.get("x-dhal-action")).toBe("block");
      expect(context.body).toMatchObject({ ruleId: "honeypot.triggered" });
    } finally {
      await engine.close();
    }
  });

  it("records the downstream response status for allowed requests", async () => {
    const engine = createDhal({ config: { ...protectionConfig, mode: "monitor" } });
    const middleware = dhalKoaFromEngine(engine);
    const context: DhalKoaContext = {
      method: "POST",
      url: "/login",
      path: "/login",
      headers: { host: "example.test", "user-agent": "vitest" },
      ip: "203.0.113.10",
      status: 200
    };

    try {
      await middleware(context, async () => {
        context.status = 401;
      });
      expect(context.status).toBe(401);
    } finally {
      await engine.close();
    }
  });
});

describe("Hono adapter", () => {
  it("returns a blocking Response for matching requests", async () => {
    const engine = createDhal({ config: protectionConfig });
    const middleware = dhalHonoFromEngine(engine);
    let downstreamCalled = false;
    const raw = new Request("http://example.test/.env", {
      headers: { "user-agent": "vitest" }
    });
    const context: DhalHonoContext = {
      req: {
        raw,
        method: raw.method,
        url: raw.url,
        path: "/.env",
        routePath: "/.env"
      }
    };

    try {
      const response = await middleware(context, async () => {
        downstreamCalled = true;
      });

      expect(downstreamCalled).toBe(false);
      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(403);
      expect(response?.headers.get("x-dhal-action")).toBe("block");
      await expect(response?.json()).resolves.toMatchObject({ ruleId: "honeypot.triggered" });
    } finally {
      await engine.close();
    }
  });

  it("delegates allowed requests to downstream middleware", async () => {
    const engine = createDhal({ config: { ...protectionConfig, mode: "monitor" } });
    const middleware = dhalHonoFromEngine(engine);
    const raw = new Request("http://example.test/health");
    let downstreamCalled = false;
    const context: DhalHonoContext = {
      req: { raw, path: "/health", routePath: "/health" },
      res: new Response("ok", { status: 204 })
    };

    try {
      const response = await middleware(context, async () => {
        downstreamCalled = true;
      });
      expect(response).toBeUndefined();
      expect(downstreamCalled).toBe(true);
    } finally {
      await engine.close();
    }
  });
});
