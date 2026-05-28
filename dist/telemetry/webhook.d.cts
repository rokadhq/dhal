import { E as DhalTelemetry, f as DhalConfig, z as DhalSecurityEvent } from '../types-CX1y5ozy.cjs';

declare class WebhookDhalTelemetry implements DhalTelemetry {
    private readonly config;
    constructor(config: DhalConfig["observability"]["webhooks"]);
    recordDecision(event: DhalSecurityEvent): void;
    private send;
}

export { WebhookDhalTelemetry };
