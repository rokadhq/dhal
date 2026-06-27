import assert from "node:assert/strict";
import { once } from "node:events";
import Koa from "koa";
import { Hono } from "hono";
import {
  createDhal,
  dhalHonoFromEngine,
  dhalKoaFromEngine
} from "../dist/index.js";

const config = {
  mode: "block",
  rateLimit: { enabled: false },
  rules: {
    honeypot: { enabled: true, paths: ["/.env"] },
    bot: { enabled: false },
    credentialStuffing: { enabled: false }
  },
  observability: { logs: { enabled: false } }
};

await verifyKoa();
await verifyHono();
console.log("Verified real Koa and Hono middleware registration and blocking behavior.");

async function verifyKoa() {
  const engine = createDhal({ config });
  const app = new Koa();
  app.use(dhalKoaFromEngine(engine));
  app.use((context) => {
    context.status = 200;
    context.body = { ok: true };
  });

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address();
    assert(address && typeof address !== "string", "Expected Koa to listen on a TCP port.");
    const response = await fetch(`http://127.0.0.1:${address.port}/.env`);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("x-dhal-action"), "block");
    assert.deepEqual(await response.json(), {
      error: "Request blocked by Dhal",
      reason: "Honeypot canary was triggered",
      ruleId: "honeypot.triggered"
    });
  } finally {
    await engine.close();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function verifyHono() {
  const engine = createDhal({ config });
  const app = new Hono();
  app.use("*", dhalHonoFromEngine(engine));
  app.get("/.env", (context) => context.json({ ok: true }));

  try {
    const response = await app.request("http://dhal.test/.env");
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("x-dhal-action"), "block");
    assert.deepEqual(await response.json(), {
      error: "Request blocked by Dhal",
      reason: "Honeypot canary was triggered",
      ruleId: "honeypot.triggered"
    });
  } finally {
    await engine.close();
  }
}
