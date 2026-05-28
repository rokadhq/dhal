import type { DhalSignalStore } from "../types.js";

type Bucket = {
  count: number;
  resetAt: number;
};

export class MemorySignalStore implements DhalSignalStore {
  private readonly buckets = new Map<string, Bucket>();

  async record(key: string, windowSeconds: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const bucket = { count: 1, resetAt: now + windowSeconds * 1000 };
      this.buckets.set(key, bucket);
      return bucket;
    }

    existing.count += 1;
    return existing;
  }

  async count(key: string): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.delete(key);
      return { count: 0, resetAt: now };
    }

    return existing;
  }
}
