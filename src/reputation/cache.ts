import type { IpReputationResult } from "../types.js";

export class IpReputationCache {
  private readonly entries = new Map<string, IpReputationResult>();
  private readonly inFlight = new Set<string>();

  get(ip: string): IpReputationResult | undefined {
    const item = this.entries.get(ip);
    if (!item) return undefined;

    if (item.expiresAt <= Date.now()) {
      this.entries.delete(ip);
      return undefined;
    }

    return item;
  }

  set(ip: string, result: IpReputationResult): void {
    this.entries.set(ip, result);
  }

  markInFlight(ip: string): boolean {
    if (this.inFlight.has(ip)) return false;
    this.inFlight.add(ip);
    return true;
  }

  clearInFlight(ip: string): void {
    this.inFlight.delete(ip);
  }

  size(): number {
    return this.entries.size;
  }
}
