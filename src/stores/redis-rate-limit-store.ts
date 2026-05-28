import type { DhalRateLimitConfig, RateLimitStore } from "../types.js";

export type RedisLikeClient = {
  incr(key: string): Promise<number> | number;
  pexpire?(key: string, milliseconds: number): Promise<unknown> | unknown;
  expire?(key: string, seconds: number): Promise<unknown> | unknown;
};

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly client: RedisLikeClient, private readonly options: {
    prefix?: string;
  } = {}) {}

  async consume(key: string, limit: DhalRateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const windowMs = limit.windowSeconds * 1000;
    const bucket = Math.floor(now / windowMs);
    const redisKey = `${this.options.prefix ?? "dhal:rl"}:${hashKey(key)}:${bucket}`;

    const count = await this.client.incr(redisKey);
    if (count === 1) {
      if (this.client.pexpire) {
        await this.client.pexpire(redisKey, windowMs + 1000);
      } else if (this.client.expire) {
        await this.client.expire(redisKey, limit.windowSeconds + 1);
      }
    }

    const allowed = count <= limit.max;
    return {
      allowed,
      remaining: Math.max(0, limit.max - count),
      resetAt: (bucket + 1) * windowMs
    };
  }
}

function hashKey(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
