import express from "express";
import Redis from "ioredis";
import { dhal } from "../src/adapters/express.js";
import { RedisRateLimitStore } from "../src/stores/redis-rate-limit-store.js";

const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const rateLimitStore = new RedisRateLimitStore(redis);

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(dhal({ rateLimitStore }));

app.get("/", (_req, res) => {
  res.json({ ok: true, store: "redis" });
});

app.listen(3000, () => {
  console.log("Dhal Express + Redis example running on http://localhost:3000");
});
