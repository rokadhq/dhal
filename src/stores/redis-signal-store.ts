import type { DhalSignalStore } from "../types.js";

export type RedisSignalLikeClient = {
  incr(key: string): Promise<number> | number;
  ttl?(key: string): Promise<number> | number;
  pttl?(key: string): Promise<number> | number;
  pexpire?(key: string, milliseconds: number): Promise<unknown> | unknown;
  expire?(key: string, seconds: number): Promise<unknown> | unknown;
  get?(key: string): Promise<string | number | null> | string | number | null;
};

export class RedisSignalStore implements DhalSignalStore {
  constructor(private readonly client: RedisSignalLikeClient, private readonly options: {
    prefix?: string;
  } = {}) {}

  async record(key: string, windowSeconds: number): Promise<{ count: number; resetAt: number }> {
    const redisKey = this.key(key);
    const count = Number(await this.client.incr(redisKey));

    if (count === 1) {
      if (this.client.pexpire) {
        await this.client.pexpire(redisKey, windowSeconds * 1000);
      } else if (this.client.expire) {
        await this.client.expire(redisKey, windowSeconds);
      }
    }

    return {
      count,
      resetAt: await this.resetAt(redisKey, windowSeconds)
    };
  }

  async count(key: string): Promise<{ count: number; resetAt: number }> {
    const redisKey = this.key(key);
    const raw = this.client.get ? await this.client.get(redisKey) : null;
    const count = typeof raw === "number" ? raw : raw ? Number(raw) : 0;

    return {
      count: Number.isFinite(count) ? count : 0,
      resetAt: count > 0 ? await this.resetAt(redisKey, 1) : Date.now()
    };
  }

  private key(input: string): string {
    return `${this.options.prefix ?? "dhal:sig"}:${hashKey(input)}`;
  }

  private async resetAt(redisKey: string, fallbackWindowSeconds: number): Promise<number> {
    if (this.client.pttl) {
      const ttl = Number(await this.client.pttl(redisKey));
      if (ttl > 0) return Date.now() + ttl;
    }

    if (this.client.ttl) {
      const ttl = Number(await this.client.ttl(redisKey));
      if (ttl > 0) return Date.now() + ttl * 1000;
    }

    return Date.now() + fallbackWindowSeconds * 1000;
  }
}

function hashKey(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
