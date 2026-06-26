import { F as DhalTelemetry, A as DhalSecurityEvent } from '../types-C1dYoaci.cjs';

type OtelAdapterOptions = {
    serviceName: string;
    emitAllowedRequests?: boolean;
};
declare class OpenTelemetryDhalTelemetry implements DhalTelemetry {
    private readonly options;
    private apiPromise;
    constructor(options: OtelAdapterOptions);
    recordDecision(event: DhalSecurityEvent): void;
    private loadApi;
}

export { OpenTelemetryDhalTelemetry };
