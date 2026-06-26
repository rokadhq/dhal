import type { DhalSecurityEvent } from "../types.js";
import type { DhalManagedTelemetry, DhalTelemetryHealth } from "./lifecycle.js";

export class CompositeDhalTelemetry implements DhalManagedTelemetry {
  constructor(private readonly delegates: DhalManagedTelemetry[]) {}

  recordDecision(event: DhalSecurityEvent): void {
    for (const delegate of this.delegates) {
      try {
        delegate.recordDecision(event);
      } catch {
        // Telemetry must never affect request handling.
      }
    }
  }

  async flush(timeoutMs?: number): Promise<void> {
    const results = await Promise.allSettled(
      this.delegates.map(async (delegate) => delegate.flush?.(timeoutMs))
    );
    const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failure) throw failure.reason;
  }

  async close(timeoutMs?: number): Promise<void> {
    const results = await Promise.allSettled(
      this.delegates.map(async (delegate) => {
        if (delegate.close) await delegate.close(timeoutMs);
        else await delegate.flush?.(timeoutMs);
      })
    );
    const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failure) throw failure.reason;
  }

  getHealth(): DhalTelemetryHealth {
    const health = this.delegates
      .map((delegate) => delegate.getHealth?.())
      .filter((value): value is DhalTelemetryHealth => value !== undefined);

    return health.reduce<DhalTelemetryHealth>((total, current) => ({
      pending: total.pending + current.pending,
      delivered: total.delivered + current.delivered,
      failed: total.failed + current.failed,
      dropped: total.dropped + current.dropped,
      closed: total.closed && current.closed
    }), {
      pending: 0,
      delivered: 0,
      failed: 0,
      dropped: 0,
      closed: health.length > 0
    });
  }
}
