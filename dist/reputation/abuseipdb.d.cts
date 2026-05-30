import { I as IpReputationProvider, F as IpReputationResult, f as DhalConfig } from '../types-6Dn0mDWH.cjs';

declare class AbuseIpDbProvider implements IpReputationProvider {
    private readonly options;
    readonly name = "abuseipdb";
    constructor(options: {
        apiKey: string;
        cacheTtlSeconds: number;
        maxAgeInDays: number;
        timeoutMs: number;
        endpoint?: string;
    });
    check(ip: string): Promise<IpReputationResult>;
}
declare function createAbuseIpDbProviderFromConfig(config: DhalConfig): AbuseIpDbProvider | undefined;

export { AbuseIpDbProvider, createAbuseIpDbProviderFromConfig };
