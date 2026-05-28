import type { DhalConfig, DhalDecision, DhalRequest, RateLimitStore } from "../types.js";
import { pickRouteLimit } from "../utils/route.js";

export async function evaluateRateLimitRule(args: {
  req: DhalRequest;
  config: DhalConfig;
  store: RateLimitStore;
}): Promise<DhalDecision | undefined> {
  const { req, config, store } = args;

  if (!config.rateLimit.enabled) return undefined;

  const { pattern, limit } = pickRouteLimit(config, req.route ?? req.path);
  const key = buildRateLimitKey(req, config, pattern);
  const result = await store.consume(key, limit);

  if (result.allowed) return undefined;

  return {
    action: "block",
    statusCode: 429,
    reason: "Rate limit exceeded",
    ruleId: "rate_limit.exceeded",
    score: 80,
    meta: {
      key,
      routePattern: pattern,
      limit,
      remaining: result.remaining,
      resetAt: result.resetAt
    }
  };
}

function buildRateLimitKey(req: DhalRequest, config: DhalConfig, routePattern: string): string {
  const parts = config.rateLimit.keyBy.map((key) => {
    if (key === "route") return `route:${routePattern}`;
    return `${key}:${req[key] ?? "anonymous"}`;
  });

  return parts.join("|");
}
