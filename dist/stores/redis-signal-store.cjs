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

// src/stores/redis-signal-store.ts
var redis_signal_store_exports = {};
__export(redis_signal_store_exports, {
  RedisSignalStore: () => RedisSignalStore
});
module.exports = __toCommonJS(redis_signal_store_exports);
var RedisSignalStore = class {
  constructor(client, options = {}) {
    this.client = client;
    this.options = options;
  }
  client;
  options;
  async record(key, windowSeconds) {
    const redisKey = this.key(key);
    const count = Number(await this.client.incr(redisKey));
    if (count === 1) {
      if (this.client.pexpire) {
        await this.client.pexpire(redisKey, windowSeconds * 1e3);
      } else if (this.client.expire) {
        await this.client.expire(redisKey, windowSeconds);
      }
    }
    return {
      count,
      resetAt: await this.resetAt(redisKey, windowSeconds)
    };
  }
  async count(key) {
    const redisKey = this.key(key);
    const raw = this.client.get ? await this.client.get(redisKey) : null;
    const count = typeof raw === "number" ? raw : raw ? Number(raw) : 0;
    return {
      count: Number.isFinite(count) ? count : 0,
      resetAt: count > 0 ? await this.resetAt(redisKey, 1) : Date.now()
    };
  }
  key(input) {
    return `${this.options.prefix ?? "dhal:sig"}:${hashKey(input)}`;
  }
  async resetAt(redisKey, fallbackWindowSeconds) {
    if (this.client.pttl) {
      const ttl = Number(await this.client.pttl(redisKey));
      if (ttl > 0) return Date.now() + ttl;
    }
    if (this.client.ttl) {
      const ttl = Number(await this.client.ttl(redisKey));
      if (ttl > 0) return Date.now() + ttl * 1e3;
    }
    return Date.now() + fallbackWindowSeconds * 1e3;
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
  RedisSignalStore
});
