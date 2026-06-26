import type { DhalConfig, IpReputationProvider, IpReputationResult } from "../types.js";

const MAX_ATTEMPTS = 2;
const MAX_RETRY_DELAY_MS = 250;
const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

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
    const url = new URL(this.options.endpoint ?? "https://api.abuseipdb.com/api/v2/check");
    url.searchParams.set("ipAddress", ip);
    url.searchParams.set("maxAgeInDays", String(this.options.maxAgeInDays));
    url.searchParams.set("verbose", "true");
    const deadline = Date.now() + this.options.timeoutMs;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;

      try {
        const response = await this.request(url, remainingMs);
        if (response.ok) return this.parseResult(ip, response);

        const error = new Error(`AbuseIPDB request failed: ${response.status} ${response.statusText}`);
        if (!TRANSIENT_STATUS_CODES.has(response.status) || attempt === MAX_ATTEMPTS) throw error;

        lastError = error;
        await response.body?.cancel().catch(() => undefined);
        const retryDelayMs = retryDelay(response.headers.get("retry-after"));
        if (!await sleepWithinBudget(retryDelayMs, deadline)) break;
      } catch (error) {
        lastError = error;
        if (attempt === MAX_ATTEMPTS || isAbortError(error)) break;
        if (!await sleepWithinBudget(50, deadline)) break;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`AbuseIPDB request timed out after ${this.options.timeoutMs}ms`);
  }

  private async request(url: URL, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));

    try {
      return await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Key: this.options.apiKey
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseResult(ip: string, response: Response): Promise<IpReputationResult> {
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

function retryDelay(header: string | null): number {
  if (!header) return 50;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, seconds * 1000));
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.min(MAX_RETRY_DELAY_MS, Math.max(0, date - Date.now())) : 50;
}

async function sleepWithinBudget(delayMs: number, deadline: number): Promise<boolean> {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 1) return false;
  await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, remainingMs - 1)));
  return Date.now() < deadline;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
