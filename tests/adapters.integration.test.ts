import http, { type Server } from "node:http";
import { once } from "node:events";
import express from "express";
import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { dhal } from "../src/adapters/express.js";
import { dhalFastify } from "../src/adapters/fastify.js";
import { createNodeHttpDhal } from "../src/adapters/node-http.js";
import type { DhalOptions } from "../src/types.js";

const options: DhalOptions = {
  configPath: "./missing-dhal-adapter-config.json",
  logger: { log() {}, warn() {}, error() {} },
  config: {
    mode: "block",
    rateLimit: { enabled: false },
    rules: {
      honeypot: { enabled: true, paths: ["/.env"] },
      bot: { enabled: false },
      credentialStuffing: { enabled: false }
    },
    observability: {
      logs: { enabled: false },
      events: { enabled: false },
      otel: { enabled: false },
      webhooks: { enabled: false }
    }
  }
};

describe("stable framework adapters", () => {
  it("protects Express routes and allows normal traffic", async () => {
    const app = express();
    app.use(dhal(options));
    app.get("/ok", (_req, res) => res.status(200).json({ ok: true }));

    const server = app.listen(0);
    await once(server, "listening");

    try {
      const baseUrl = serverUrl(server);
      const allowed = await fetch(`${baseUrl}/ok`);
      const blocked = await fetch(`${baseUrl}/.env`);

      expect(allowed.status).toBe(200);
      expect(blocked.status).toBe(403);
      expect(blocked.headers.get("x-dhal-action")).toBe("block");
    } finally {
      await closeServer(server);
    }
  });

  it("protects root Fastify routes after normal plugin registration", async () => {
    const app = fastify({ logger: false });
    await app.register(dhalFastify(options));
    app.get("/ok", async () => ({ ok: true }));

    try {
      const allowed = await app.inject({ method: "GET", url: "/ok" });
      const blocked = await app.inject({ method: "GET", url: "/.env" });

      expect(allowed.statusCode).toBe(200);
      expect(blocked.statusCode).toBe(403);
      expect(blocked.headers["x-dhal-action"]).toBe("block");
    } finally {
      await app.close();
    }
  });

  it("protects raw node:http servers", async () => {
    const protection = createNodeHttpDhal(options);
    const server = http.createServer(async (req, res) => {
      const decision = await protection.inspect(req, res);
      if (decision.action === "block") return;
      res.statusCode = 200;
      res.end("ok");
    });

    server.listen(0);
    await once(server, "listening");

    try {
      const baseUrl = serverUrl(server);
      const allowed = await fetch(`${baseUrl}/ok`);
      const blocked = await fetch(`${baseUrl}/.env`);

      expect(allowed.status).toBe(200);
      expect(blocked.status).toBe(403);
      expect(blocked.headers.get("x-dhal-action")).toBe("block");
    } finally {
      await closeServer(server);
    }
  });
});

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
