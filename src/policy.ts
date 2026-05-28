import type {
  DhalAuditExplanation,
  DhalConfig,
  DhalDecision,
  DhalRequest,
  DhalRouteProfile,
  DhalRuleSuppression,
  DhalSecurityEvent,
  DhalSeverity
} from "./types.js";
import { matchesRoutePattern } from "./utils/route.js";

const SEVERITY_RANK: Record<DhalSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export type DhalPolicyEvaluationContext = {
  req: DhalRequest;
  config: DhalConfig;
  routePattern: string;
  routeProfile?: DhalRouteProfile | undefined;
  ruleCategory: string;
};

export function applyPolicyToDecision(decision: DhalDecision, context: DhalPolicyEvaluationContext): DhalDecision {
  const severity = resolveSeverity(decision, context.config, context.ruleCategory);
  const suppression = decision.action === "block" ? findMatchingSuppression(decision, context) : undefined;

  if (!suppression) {
    return {
      ...decision,
      severity,
      meta: {
        ...decision.meta,
        severity
      }
    };
  }

  return {
    ...decision,
    action: "allow",
    statusCode: 200,
    severity,
    wouldBlock: true,
    reason: `Suppressed by policy: ${suppression.reason}`,
    meta: {
      ...decision.meta,
      severity,
      suppressed: true,
      suppressionId: suppression.id,
      suppressionReason: suppression.reason,
      originalAction: decision.action,
      originalStatusCode: decision.statusCode,
      originalReason: decision.reason
    }
  };
}

export function resolveSeverity(decision: DhalDecision, config: DhalConfig, ruleCategory: string): DhalSeverity {
  if (decision.severity) return decision.severity;
  const ruleSeverity = decision.ruleId ? config.policy.severity.rules[decision.ruleId] : undefined;
  if (ruleSeverity) return ruleSeverity;
  const categorySeverity = config.policy.severity.categories[ruleCategory];
  if (categorySeverity) return categorySeverity;
  return config.policy.severity.default;
}

export function buildAuditExplanation(event: Omit<DhalSecurityEvent, "audit">): DhalAuditExplanation | undefined {
  if (!event.decision.ruleId && event.decision.action === "allow" && !event.decision.wouldBlock) return undefined;

  return {
    ruleId: event.decision.ruleId,
    ruleCategory: event.ruleCategory,
    severity: event.severity,
    reason: event.decision.reason,
    action: event.decision.action,
    wouldBlock: Boolean(event.decision.wouldBlock),
    suppressed: event.decision.meta?.suppressed === true,
    suppressionId: typeof event.decision.meta?.suppressionId === "string" ? event.decision.meta.suppressionId : undefined,
    routePattern: typeof event.decision.meta?.routePattern === "string" ? event.decision.meta.routePattern : undefined,
    routeTags: Array.isArray(event.decision.meta?.routeProfileTags) ? event.decision.meta.routeProfileTags as string[] : undefined,
    matchedSignals: Array.isArray(event.decision.meta?.signals) ? event.decision.meta.signals : undefined
  };
}

export function shouldEmitSecurityEvent(event: DhalSecurityEvent, config: DhalConfig): boolean {
  if (!config.policy.sampling.enabled) return true;
  if (event.decision.action === "block") return config.policy.sampling.includeBlocked;
  if (event.decision.wouldBlock) return config.policy.sampling.includeWouldBlock;

  const ruleRate = event.decision.ruleId ? config.policy.sampling.rules[event.decision.ruleId] : undefined;
  const routePattern = typeof event.decision.meta?.routePattern === "string" ? event.decision.meta.routePattern : event.request.route ?? event.request.path;
  const routeRate = pickSamplingRouteRate(config, routePattern);
  const rate = ruleRate ?? routeRate ?? config.policy.sampling.rate;

  if (rate >= 1) return true;
  if (rate <= 0) return false;

  return stableSample(`${event.request.ip}|${event.request.method}|${event.request.path}|${event.eventId}`, rate);
}

export function severityAtLeast(actual: DhalSeverity, minimum: DhalSeverity): boolean {
  return SEVERITY_RANK[actual] >= SEVERITY_RANK[minimum];
}

function findMatchingSuppression(decision: DhalDecision, context: DhalPolicyEvaluationContext): DhalRuleSuppression | undefined {
  const now = Date.now();

  return context.config.policy.suppressions.find((suppression) => {
    if (!suppression.enabled) return false;
    if (suppression.expiresAt && Date.parse(suppression.expiresAt) < now) return false;
    if (suppression.ruleId && suppression.ruleId !== decision.ruleId) return false;
    if (suppression.ruleCategory && suppression.ruleCategory !== context.ruleCategory) return false;
    if (suppression.route && !matchesRoutePattern(context.routePattern, suppression.route)) return false;
    if (suppression.path && !matchesRoutePattern(context.req.path, suppression.path)) return false;
    if (suppression.ip && suppression.ip !== context.req.ip) return false;
    if (suppression.userId && suppression.userId !== context.req.userId) return false;
    if (suppression.tenantId && suppression.tenantId !== context.req.tenantId) return false;
    if (suppression.apiKeyId && suppression.apiKeyId !== context.req.apiKeyId) return false;
    return true;
  });
}

function pickSamplingRouteRate(config: DhalConfig, routePattern: string): number | undefined {
  let best: { pattern: string; rate: number; score: number } | undefined;

  for (const [pattern, rate] of Object.entries(config.policy.sampling.routes)) {
    if (!matchesRoutePattern(routePattern, pattern)) continue;
    const score = pattern.replaceAll("*", "").length;
    if (!best || score > best.score) {
      best = { pattern, rate, score };
    }
  }

  return best?.rate;
}

function stableSample(value: string, rate: number): boolean {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = (hash >>> 0) / 0xffffffff;
  return normalized < rate;
}
