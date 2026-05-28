// src/stores/memory-signal-store.ts
var MemorySignalStore = class {
  buckets = /* @__PURE__ */ new Map();
  async record(key, windowSeconds) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const bucket = { count: 1, resetAt: now + windowSeconds * 1e3 };
      this.buckets.set(key, bucket);
      return bucket;
    }
    existing.count += 1;
    return existing;
  }
  async count(key) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.delete(key);
      return { count: 0, resetAt: now };
    }
    return existing;
  }
};

export {
  MemorySignalStore
};
