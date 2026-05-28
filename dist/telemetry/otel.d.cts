import { E as DhalTelemetry, z as DhalSecurityEvent } from '../types-CX1y5ozy.cjs';

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
