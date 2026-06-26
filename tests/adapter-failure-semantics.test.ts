import http, { type Server } from "node:http";
import { once } from "node:events";
import express from "express";
import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { dhal } from "../src/adapters/express.js";
import { dhalFastify } from "../src/adapters/fastify.js";
import { createNodeHttpDhal } from "../src/adapters/node-http.js";
import type { DhalInternalErrorAction, DhalOptions, RateLimitStore } from "../src/types.js";

const unavailableStore: RateLimitStore = {
  async consume() {
    throw new Error("distributed rate-limit store unavailable");
  }
};

describe("adapter internal-failure semantics", () => {
  for (const behavior of ["allow", "block"] as const) {
    it(`applies ${behavior === "allow" ? "fail-open" : "fail-closed"} behavior in Express`, async () => {
      const app = express();
      app.use(dhal(options(behavior)));
      app.get("/api", (_request, response) => response.status(200).json({ ok: true }));
      const server = app.listen(0);
      await once(server, "listening");

      try {
        assertResponse(await fetch(`${serverUrl(server)}/api`), behavior);
      } finally {
        await closeServer(server);
      }
    });

    it(`applies ${behavior === "allow" ? "fail-open" : "fail-closed"} behavior in Fastify`, async () => {
      const app = fastify({ logger: false });
      await app.register(dhalFastify(options(behavior)));
      app.get("/api", async () => ({ ok: true }));

      try {
        const response = await app.inject({ method: "GET", url: "/api" });
        expect(response.statusCode).toBe(behavior === "block" ? 503 : 200);
        expect(response.headers["x-dhal-rule"]).toBe(behavior === "block" ? "dhal.internal_error" : undefined);
      } finally {
        await app.close();
      }
    });

    it(`applies ${behavior === "allow" ? "fail-open" : "fail-closed"} behavior in node:http`, async () => {
      const protection = createNodeHttpDhal(options(behavior));
      const server = http.createServer(async (request, response) => {
        const decision = await protection.inspect(request, response);
        if (decision.action === "block") return;
        response.statusCode = 200;
        response.end("ok");
      });
      server.listen(0);
      await once(server, "listening");

      try {
        assertResponse(await fetch(`${serverUrl(server)}/api`), behavior);
      } finally {
        await closeServer(server);
      }
    });
  }

  it("always fails closed in strict mode", async () => {
    const app = fastify({ logger: false });
    await app.register(dhalFastify(options("allow", "strict")));
    app.get("/api", async () => ({ ok: true }));

    try {
      const response = await app.inject({ method: "GET", url: "/api" });
      expect(response.statusCode).toBe(503);
      expect(response.headers["x-dhal-rule"]).toBe("dhal.internal_error");
    } finally {
      await app.close();
    }
  });
});

function options(onInternalError: DhalInternalErrorAction, mode: "block" | "strict" = "block"): DhalOptions {
  return {
    configPath: "./missing-adapter-failure-config.json",
    logger: { log() {}, warn() {}, error() {} },
    rateLimitStore: unavailableStore,
    config: {
      mode,
      runtime: {
        onInternalError,
        internalErrorStatusCode: 503,
        bypass: { enabled: false }
      },
      rateLimit: { enabled: true },
      ip: { reputation: { enabled: false } },
      rules: {
        honeypot: { enabled: false },
        bot: { enabled: false },
        credentialStuffing: { enabled: false },
        headers: { enabled: false },
        contentType: { enabled: false },
        api: { enabled: false },
        largePayload: { enabled: false },
        sqli: false,
        xss: false,
        pathTraversal: false,
        badUserAgents: false
      },
      observability: {
        logs: { enabled: false },
        events: { enabled: false },
        otel: { enabled: false },
        webhooks: { enabled: false }
      }
    }
  };
}

function assertResponse(response: Response, behavior: DhalInternalErrorAction): void {
  expect(response.status).toBe(behavior === "block" ? 503 : 200);
  expect(response.headers.get("x-dhal-rule")).toBe(behavior === "block" ? "dhal.internal_error" : null);
}

function serverUrl(server: Server): string {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected an ephemeral TCP address");
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
