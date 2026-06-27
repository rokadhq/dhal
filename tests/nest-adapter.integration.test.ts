import { once } from "node:events";
import type { Server } from "node:http";
import express from "express";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  installDhalNest,
  installDhalNestFromEngine,
  type DhalNestApplication
} from "../src/adapters/nest.js";
import { createDhal } from "../src/engine.js";

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

describe("NestJS bootstrap adapter", () => {
  it("installs Dhal on NestJS applications using Express", async () => {
    const expressApplication = express();
    const nestApplication: DhalNestApplication = {
      getHttpAdapter: () => ({
        getType: () => "express",
        getInstance: () => expressApplication
      }),
      use: (...args: unknown[]) => {
        const use = expressApplication.use as unknown as (...middleware: unknown[]) => unknown;
        return use(...args);
      }
    };

    const installation = await installDhalNest(nestApplication, { config: protectionConfig });
    expressApplication.get("/.env", (_request, response) => response.status(200).json({ ok: true }));

    const server = expressApplication.listen(0);
    await once(server, "listening");

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP address");

      const response = await fetch(`http://127.0.0.1:${address.port}/.env`);
      expect(response.status).toBe(403);
      expect(response.headers.get("x-dhal-action")).toBe("block");
      expect(installation.platform).toBe("express");
    } finally {
      await installation.close();
      await closeServer(server);
    }
  });

  it("installs an existing Dhal engine on NestJS applications using Fastify", async () => {
    const fastifyApplication = Fastify();
    const nestApplication: DhalNestApplication = {
      getHttpAdapter: () => ({
        getType: () => "fastify",
        getInstance: () => fastifyApplication
      })
    };
    const engine = createDhal({ config: protectionConfig });
    const installation = await installDhalNestFromEngine(nestApplication, engine);

    fastifyApplication.get("/.env", async () => ({ ok: true }));

    try {
      const response = await fastifyApplication.inject({ method: "GET", url: "/.env" });
      expect(response.statusCode).toBe(403);
      expect(response.headers["x-dhal-action"]).toBe("block");
      expect(installation.engine).toBe(engine);
      expect(installation.platform).toBe("fastify");
    } finally {
      await installation.close();
      await fastifyApplication.close();
    }
  });

  it("rejects unsupported NestJS HTTP adapters", async () => {
    await expect(installDhalNest({
      getHttpAdapter: () => ({ getType: () => "custom-http" })
    }, { config: protectionConfig })).rejects.toThrow(/Unsupported NestJS HTTP adapter/);
  });
});

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
