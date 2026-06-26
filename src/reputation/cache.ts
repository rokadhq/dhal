import type { IpReputationResult } from "../types.js";

export type IpReputationCacheOptions = {
  maxEntries?: number | undefined;
  maxInFlight?: number | undefined;
};

export class IpReputationCache {
  private readonly entries = new Map<string, IpReputationResult>();
  private readonly inFlight = new Set<string>();
  private readonly maxEntries: number;
  private readonly maxInFlight: number;

  constructor(options: IpReputationCacheOptions = {}) {
    this.maxEntries = positiveInteger(options.maxEntries, 10_000);
    this.maxInFlight = positiveInteger(options.maxInFlight, 64);
  }

  get(ip: string): IpReputationResult | undefined {
    const item = this.entries.get(ip);
    if (!item) return undefined;

    if (item.expiresAt <= Date.now()) {
      this.entries.delete(ip);
      return undefined;
    }

    // Refresh insertion order so bounded eviction approximates LRU behavior.
    this.entries.delete(ip);
    this.entries.set(ip, item);
    return item;
  }

  set(ip: string, result: IpReputationResult): void {
    this.entries.delete(ip);
    this.entries.set(ip, result);
    this.evictOverflow();
  }

  markInFlight(ip: string): boolean {
    if (this.inFlight.has(ip) || this.inFlight.size >= this.maxInFlight) return false;
    this.inFlight.add(ip);
    return true;
  }

  clearInFlight(ip: string): void {
    this.inFlight.delete(ip);
  }

  size(): number {
    this.pruneExpired();
    return this.entries.size;
  }

  private evictOverflow(): void {
    this.pruneExpired();
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [ip, result] of this.entries) {
      if (result.expiresAt <= now) this.entries.delete(ip);
    }
  }
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}
