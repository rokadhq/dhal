import { E as DhalTelemetry, f as DhalConfig, z as DhalSecurityEvent } from '../types-6Dn0mDWH.js';

declare class WebhookDhalTelemetry implements DhalTelemetry {
    private readonly config;
    constructor(config: DhalConfig["observability"]["webhooks"]);
    recordDecision(event: DhalSecurityEvent): void;
    private send;
}

export { WebhookDhalTelemetry };
