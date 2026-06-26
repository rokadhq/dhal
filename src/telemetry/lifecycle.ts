import type { DhalTelemetry } from "../types.js";

export type DhalTelemetryHealth = {
  pending: number;
  delivered: number;
  failed: number;
  dropped: number;
  closed: boolean;
};

export interface DhalManagedTelemetry extends DhalTelemetry {
  flush?(timeoutMs?: number): Promise<void>;
  close?(timeoutMs?: number): Promise<void>;
  getHealth?(): DhalTelemetryHealth;
}

export async function flushDhalTelemetry(telemetry: DhalTelemetry | undefined, timeoutMs?: number): Promise<void> {
  const managed = telemetry as DhalManagedTelemetry | undefined;
  await managed?.flush?.(timeoutMs);
}

export async function closeDhalTelemetry(telemetry: DhalTelemetry | undefined, timeoutMs?: number): Promise<void> {
  const managed = telemetry as DhalManagedTelemetry | undefined;
  if (managed?.close) {
    await managed.close(timeoutMs);
    return;
  }
  await managed?.flush?.(timeoutMs);
}

export function getDhalTelemetryHealth(telemetry: DhalTelemetry | undefined): DhalTelemetryHealth | undefined {
  return (telemetry as DhalManagedTelemetry | undefined)?.getHealth?.();
}
