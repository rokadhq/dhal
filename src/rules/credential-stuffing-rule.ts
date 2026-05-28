import type { DhalConfig, DhalCredentialStuffingKey, DhalDecision, DhalRequest, DhalResponseOutcome, DhalSecuritySignal, DhalSignalStore } from "../types.js";
import { getHeader } from "../utils/ip.js";
import { matchesRoutePattern } from "../utils/route.js";

export async function evaluateCredentialStuffingRule(args: {
  req: DhalRequest;
  config: DhalConfig;
  store: DhalSignalStore;
}): Promise<DhalDecision | undefined> {
  const { req, config, store } = args;
  const rule = config.rules.credentialStuffing;
  if (!rule.enabled || !isCredentialRoute(req, config)) return undefined;

  const key = buildCredentialKey(req, rule.keyBy);
  const state = await store.count(key);

  if (state.count < rule.maxFailures) return undefined;

  return {
    action: "block",
    statusCode: 429,
    reason: "Credential stuffing threshold exceeded",
    ruleId: "credential_stuffing.threshold_exceeded",
    score: 90,
    meta: {
      threatKind: "credential_stuffing",
      key,
      failures: state.count,
      maxFailures: rule.maxFailures,
      resetAt: state.resetAt
    }
  };
}

export async function recordCredentialOutcome(args: {
  req: DhalRequest;
  config: DhalConfig;
  store: DhalSignalStore;
  outcome: DhalResponseOutcome;
}): Promise<DhalSecuritySignal | undefined> {
  const { req, config, store, outcome } = args;
  const rule = config.rules.credentialStuffing;
  if (!rule.enabled || !isCredentialRoute(req, config)) return undefined;
  if (!rule.failureStatusCodes.includes(outcome.statusCode)) return undefined;

  const key = buildCredentialKey(req, rule.keyBy);
  const result = await store.record(key, rule.windowSeconds);

  return {
    timestamp: new Date().toISOString(),
    kind: "credential_failure",
    key,
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      route: req.route,
      userId: req.userId,
      tenantId: req.tenantId,
      apiKeyId: req.apiKeyId
    },
    meta: {
      statusCode: outcome.statusCode,
      count: result.count,
      resetAt: result.resetAt,
      maxFailures: rule.maxFailures
    }
  };
}

export function isCredentialRoute(req: DhalRequest, config: DhalConfig): boolean {
  const routeOrPath = req.route ?? req.path;
  return config.rules.credentialStuffing.loginPathPatterns.some((pattern) =>
    matchesRoutePattern(routeOrPath, pattern) || matchesRoutePattern(req.path, pattern)
  );
}

export function buildCredentialKey(req: DhalRequest, keyBy: DhalCredentialStuffingKey[]): string {
  return keyBy.map((key) => {
    if (key === "route") return `route:${req.route ?? req.path}`;
    if (key === "userAgent") return `userAgent:${getHeader(req.headers, "user-agent") ?? "unknown"}`;
    return `${key}:${req[key] ?? "anonymous"}`;
  }).join("|");
}
