import { IpReputationCache } from "../reputation/cache.js";
import type { DhalConfig, DhalDecision, DhalRequest, IpReputationProvider } from "../types.js";

export type IpReputationEvaluator = {
  evaluate(req: DhalRequest): Promise<DhalDecision | undefined>;
};

export function createIpReputationEvaluator(args: {
  config: DhalConfig;
  provider?: IpReputationProvider | undefined;
  cache?: IpReputationCache | undefined;
  logger?: Pick<Console, "warn" | "error"> | undefined;
}): IpReputationEvaluator {
  const { config, provider, logger = console } = args;
  const cache = args.cache ?? new IpReputationCache();

  return {
    async evaluate(req: DhalRequest): Promise<DhalDecision | undefined> {
      if (!config.ip.reputation.enabled || !provider) return undefined;

      const cached = cache.get(req.ip);
      if (cached) return decisionFromResult(req.ip, config, cached);

      if (config.ip.reputation.mode === "blocking") {
        try {
          const result = await provider.check(req.ip);
          cache.set(req.ip, result);
          return decisionFromResult(req.ip, config, result);
        } catch (error) {
          logger.warn(`[dhal] IP reputation lookup failed for ${req.ip}: ${error instanceof Error ? error.message : String(error)}`);
          return undefined;
        }
      }

      if (cache.markInFlight(req.ip)) {
        void provider.check(req.ip)
          .then((result) => cache.set(req.ip, result))
          .catch((error) => logger.warn(`[dhal] async IP reputation lookup failed for ${req.ip}: ${error instanceof Error ? error.message : String(error)}`))
          .finally(() => cache.clearInFlight(req.ip));
      }

      return undefined;
    }
  };
}

function decisionFromResult(ip: string, config: DhalConfig, result: Awaited<ReturnType<IpReputationProvider["check"]>>): DhalDecision | undefined {
  if (result.score < config.ip.reputation.minScore) return undefined;

  return {
    action: "block",
    statusCode: config.response.blockStatusCode,
    reason: `IP reputation score ${result.score} exceeds threshold ${config.ip.reputation.minScore}`,
    ruleId: "ip.reputation",
    score: Math.max(75, result.score),
    meta: {
      ip,
      provider: result.provider,
      reputationScore: result.score,
      totalReports: result.totalReports,
      countryCode: result.countryCode,
      usageType: result.usageType,
      isp: result.isp,
      domain: result.domain,
      checkedAt: result.checkedAt,
      expiresAt: result.expiresAt
    }
  };
}
