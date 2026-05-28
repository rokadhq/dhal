import type { DhalConfig, IpReputationProvider, IpReputationResult } from "../types.js";

export class AbuseIpDbProvider implements IpReputationProvider {
  readonly name = "abuseipdb";

  constructor(private readonly options: {
    apiKey: string;
    cacheTtlSeconds: number;
    maxAgeInDays: number;
    timeoutMs: number;
    endpoint?: string;
  }) {}

  async check(ip: string): Promise<IpReputationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const url = new URL(this.options.endpoint ?? "https://api.abuseipdb.com/api/v2/check");
      url.searchParams.set("ipAddress", ip);
      url.searchParams.set("maxAgeInDays", String(this.options.maxAgeInDays));
      url.searchParams.set("verbose", "true");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Key: this.options.apiKey
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`AbuseIPDB request failed: ${response.status} ${response.statusText}`);
      }

      const payload = await response.json() as AbuseIpDbResponse;
      const data = payload.data;
      const now = Date.now();

      return {
        ip,
        provider: this.name,
        score: Number(data.abuseConfidenceScore ?? 0),
        totalReports: typeof data.totalReports === "number" ? data.totalReports : undefined,
        countryCode: data.countryCode,
        usageType: data.usageType,
        isp: data.isp,
        domain: data.domain,
        checkedAt: now,
        expiresAt: now + this.options.cacheTtlSeconds * 1000,
        raw: data
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

type AbuseIpDbResponse = {
  data: {
    ipAddress?: string;
    abuseConfidenceScore?: number;
    countryCode?: string;
    usageType?: string;
    isp?: string;
    domain?: string;
    totalReports?: number;
  };
};

export function createAbuseIpDbProviderFromConfig(config: DhalConfig): AbuseIpDbProvider | undefined {
  const apiKey = process.env[config.ip.reputation.apiKeyEnv];
  if (!apiKey) return undefined;

  return new AbuseIpDbProvider({
    apiKey,
    cacheTtlSeconds: config.ip.reputation.cacheTtlSeconds,
    maxAgeInDays: config.ip.reputation.maxAgeInDays,
    timeoutMs: config.ip.reputation.timeoutMs
  });
}
