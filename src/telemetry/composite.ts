import type { DhalSecurityEvent, DhalTelemetry } from "../types.js";

export class CompositeDhalTelemetry implements DhalTelemetry {
  constructor(private readonly delegates: DhalTelemetry[]) {}

  recordDecision(event: DhalSecurityEvent): void {
    for (const delegate of this.delegates) {
      try {
        delegate.recordDecision(event);
      } catch {
        // Telemetry must never affect request handling.
      }
    }
  }
}
