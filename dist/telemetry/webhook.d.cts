import { f as DhalConfig, A as DhalSecurityEvent } from '../types-C1dYoaci.cjs';
import { D as DhalManagedTelemetry, a as DhalTelemetryHealth } from '../lifecycle-CLClIjxX.cjs';

type WebhookDhalTelemetryOptions = {
    maxPending?: number;
    defaultFlushTimeoutMs?: number;
};
declare class WebhookDhalTelemetry implements DhalManagedTelemetry {
    private readonly config;
    private readonly pending;
    private readonly maxPending;
    private readonly defaultFlushTimeoutMs;
    private delivered;
    private failed;
    private dropped;
    private closed;
    constructor(config: DhalConfig["observability"]["webhooks"], options?: WebhookDhalTelemetryOptions);
    recordDecision(event: DhalSecurityEvent): void;
    flush(timeoutMs?: number): Promise<void>;
    close(timeoutMs?: number): Promise<void>;
    getHealth(): DhalTelemetryHealth;
    private send;
}

export { WebhookDhalTelemetry, type WebhookDhalTelemetryOptions };
