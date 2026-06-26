import { F as DhalTelemetry, f as DhalConfig, A as DhalSecurityEvent } from '../types-C1dYoaci.js';

declare class WebhookDhalTelemetry implements DhalTelemetry {
    private readonly config;
    constructor(config: DhalConfig["observability"]["webhooks"]);
    recordDecision(event: DhalSecurityEvent): void;
    private send;
}

export { WebhookDhalTelemetry };
