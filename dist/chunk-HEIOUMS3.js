// src/stores/redis-rate-limit-store.ts
var RedisRateLimitStore = class {
  constructor(client, options = {}) {
    this.client = client;
    this.options = options;
  }
  client;
  options;
  async consume(key, limit) {
    const now = Date.now();
    const windowMs = limit.windowSeconds * 1e3;
    const bucket = Math.floor(now / windowMs);
    const redisKey = `${this.options.prefix ?? "dhal:rl"}:${hashKey(key)}:${bucket}`;
    const count = await this.client.incr(redisKey);
    if (count === 1) {
      if (this.client.pexpire) {
        await this.client.pexpire(redisKey, windowMs + 1e3);
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
};
function hashKey(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) + hash ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export {
  RedisRateLimitStore
};
