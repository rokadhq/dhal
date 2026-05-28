import Fastify from "fastify";
import { dhalFastify } from "../src/adapters/fastify.js";

const app = Fastify({ logger: true });

await app.register(dhalFastify());

app.get("/", async () => {
  return { ok: true, service: "dhal fastify example" };
});

app.post("/api/login", async () => {
  return { ok: true };
});

await app.listen({ port: 3000, host: "0.0.0.0" });
