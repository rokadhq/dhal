"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/stores/redis-rate-limit-store.ts
var redis_rate_limit_store_exports = {};
__export(redis_rate_limit_store_exports, {
  RedisRateLimitStore: () => RedisRateLimitStore
});
module.exports = __toCommonJS(redis_rate_limit_store_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RedisRateLimitStore
});
