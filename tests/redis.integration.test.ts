import Redis from "ioredis";
import { describe, expect, it } from "vitest";
import { RedisRateLimitStore } from "../src/stores/redis-rate-limit-store.js";
import { RedisSignalStore } from "../src/stores/redis-signal-store.js";

const redisUrl = process.env.DHAL_REDIS_URL;
const integration = redisUrl ? describe : describe.skip;

integration("distributed Redis/Valkey stores", () => {
  it("shares rate-limit state across application instances", async () => {
    const clientA = new Redis(redisUrl!);
    const clientB = new Redis(redisUrl!);
    const prefix = `dhal:test:rl:${Date.now()}:${Math.random()}`;

    try {
      const storeA = new RedisRateLimitStore(clientA, { prefix });
      const storeB = new RedisRateLimitStore(clientB, { prefix });
      const limit = { windowSeconds: 30, max: 2 };

      const first = await storeA.consume("tenant:acme|route:/api", limit);
      const second = await storeB.consume("tenant:acme|route:/api", limit);
      const third = await storeA.consume("tenant:acme|route:/api", limit);

      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(true);
      expect(third.allowed).toBe(false);
      expect(third.remaining).toBe(0);
      expect(first.resetAt).toBe(second.resetAt);
    } finally {
      await Promise.all([clientA.quit(), clientB.quit()]);
    }
  });

  it("shares credential and behavior signals across application instances", async () => {
    const clientA = new Redis(redisUrl!);
    const clientB = new Redis(redisUrl!);
    const prefix = `dhal:test:sig:${Date.now()}:${Math.random()}`;

    try {
      const storeA = new RedisSignalStore(clientA, { prefix });
      const storeB = new RedisSignalStore(clientB, { prefix });
      const key = "ip:203.0.113.7|route:/login";

      await storeA.record(key, 30);
      const second = await storeB.record(key, 30);
      const count = await storeA.count(key);

      expect(second.count).toBe(2);
      expect(count.count).toBe(2);
      expect(count.resetAt).toBeGreaterThan(Date.now());
    } finally {
      await Promise.all([clientA.quit(), clientB.quit()]);
    }
  });
});
