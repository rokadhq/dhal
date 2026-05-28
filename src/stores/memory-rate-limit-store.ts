import type { DhalRateLimitConfig, RateLimitStore } from "../types.js";

type Bucket = {
  tokens: number;
  lastRefillMs: number;
};

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  async consume(key: string, limit: DhalRateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const windowMs = limit.windowSeconds * 1000;
    const refillPerMs = limit.max / windowMs;

    const existing = this.buckets.get(key) ?? {
      tokens: limit.max,
      lastRefillMs: now
    };

    const elapsedMs = Math.max(0, now - existing.lastRefillMs);
    const refilled = Math.min(limit.max, existing.tokens + elapsedMs * refillPerMs);
    const allowed = refilled >= 1;
    const nextTokens = allowed ? refilled - 1 : refilled;

    this.buckets.set(key, {
      tokens: nextTokens,
      lastRefillMs: now
    });

    const missingTokens = Math.max(0, 1 - nextTokens);
    const resetAt = now + Math.ceil(missingTokens / refillPerMs);

    // Opportunistic cleanup. Keeps memory bounded for low-volume apps.
    if (this.buckets.size > 10_000) {
      this.sweep(now, windowMs);
    }

    return {
      allowed,
      remaining: Math.floor(nextTokens),
      resetAt
    };
  }

  private sweep(now: number, ttlMs: number): void {
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefillMs > ttlMs * 2) {
        this.buckets.delete(key);
      }
    }
  }
}
