import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { loadDhalConfig } from "./config.js";
import { createAbuseIpDbProviderFromConfig } from "./reputation/abuseipdb.js";
import { IpReputationCache } from "./reputation/cache.js";
import { applyPolicyToDecision, buildAuditExplanation, shouldEmitSecurityEvent } from "./policy.js";
import { evaluateApiPositiveSecurityRule } from "./rules/api-rules.js";
import { evaluateBotRule } from "./rules/bot-rule.js";
import { evaluateContentTypeRule } from "./rules/content-type-rule.js";
import { evaluateCredentialStuffingRule, recordCredentialOutcome } from "./rules/credential-stuffing-rule.js";
import { evaluateHeaderRules } from "./rules/header-rules.js";
import { evaluateHoneypotRule } from "./rules/honeypot-rule.js";
import { evaluateIpRules } from "./rules/ip-rules.js";
import { createIpReputationEvaluator, type IpReputationEvaluator } from "./rules/ip-reputation-rule.js";
import { evaluateRateLimitRule } from "./rules/rate-limit-rule.js";
import { evaluateSignatureRules } from "./rules/signature-rules.js";
import { MemoryRateLimitStore } from "./stores/memory-rate-limit-store.js";
import { MemorySignalStore } from "./stores/memory-signal-store.js";
import { CompositeDhalTelemetry } from "./telemetry/composite.js";
import { DhalEventBus } from "./telemetry/events.js";
import { OpenTelemetryDhalTelemetry } from "./telemetry/otel.js";
import { WebhookDhalTelemetry } from "./telemetry/webhook.js";
import type { DhalConfig, DhalDecision, DhalOptions, DhalRequest, DhalResponseOutcome, DhalRouteProfile, DhalSecurityEvent, DhalSignalStore, DhalTelemetry, RateLimitStore } from "./types.js";
import { getHeader } from "./utils/ip.js";
import { extractIdentity } from "./utils/identity.js";
import { createRouteSecurityContext } from "./utils/route.js";

export type DhalEngine = {
  readonly config: DhalConfig;
  readonly events: DhalEventBus;
  inspect(req: DhalRequest): Promise<DhalDecision>;
  recordOutcome(req: DhalRequest, outcome: DhalResponseOutcome): Promise<void>;
};

export function createDhal(options: DhalOptions = {}): DhalEngine {
  const config = loadDhalConfig(options.configPath, options.config);
  const logger = options.logger ?? console;
  const events = new DhalEventBus();
  const rateLimitStore = options.rateLimitStore ?? new MemoryRateLimitStore();
  const signalStore = options.signalStore ?? new MemorySignalStore();
  const ipReputationProvider = options.ipReputationProvider ?? createAbuseIpDbProviderFromConfig(config);
  const telemetry = options.telemetry ?? createTelemetry(config);
  const ipReputationCache = new IpReputationCache();

  if (config.rateLimit.store === "redis" && !options.rateLimitStore) {
    logger.warn("[dhal] rateLimit.store is set to redis, but no rateLimitStore was provided. Falling back to memory store.");
  }

  if (config.ip.reputation.enabled && !ipReputationProvider) {
    logger.warn(`[dhal] IP reputation is enabled, but no provider is configured. Set ${config.ip.reputation.apiKeyEnv} or pass ipReputationProvider.`);
  }

  async function inspect(req: DhalRequest): Promise<DhalDecision> {
    const startedAt = performance.now();
    const normalizedReq = normalizeRequest(req, config);
    const context = createRouteSecurityContext(config, normalizedReq.route ?? normalizedReq.path);
    const effectiveConfig = context.config;
    const ipReputation = createIpReputationEvaluator({
      config: effectiveConfig,
      provider: ipReputationProvider,
      cache: ipReputationCache,
      logger
    });
    let decision: DhalDecision;

    try {
      decision = await evaluate(normalizedReq, effectiveConfig, rateLimitStore, signalStore, ipReputation);
    } catch (error) {
      const shouldBlock = effectiveConfig.runtime.onInternalError === "block" || effectiveConfig.mode === "strict";
      decision = {
        action: shouldBlock ? "block" : "allow",
        statusCode: shouldBlock ? effectiveConfig.runtime.internalErrorStatusCode : 200,
        reason: "Dhal internal rule evaluation error",
        ruleId: "dhal.internal_error",
        score: shouldBlock ? 100 : 0,
        meta: {
          error: error instanceof Error ? error.message : String(error),
          failBehavior: shouldBlock ? "closed" : "open"
        }
      };
    }

    const durationMs = performance.now() - startedAt;
    if (effectiveConfig.runtime.maxInspectionMs > 0 && durationMs > effectiveConfig.runtime.maxInspectionMs) {
      decision = {
        ...decision,
        meta: {
          ...decision.meta,
          inspectionOverBudget: true,
          inspectionDurationMs: durationMs,
          inspectionBudgetMs: effectiveConfig.runtime.maxInspectionMs
        }
      };
    }

    decision = enrichDecision(decision, effectiveConfig, context.routePattern, context.routeProfile);

    const ruleCategory = deriveRuleCategory(decision.ruleId);
    const policyDecision = applyPolicyToDecision(decision, {
      req: normalizedReq,
      config: effectiveConfig,
      routePattern: context.routePattern,
      routeProfile: context.routeProfile,
      ruleCategory
    });
    const emitted = applyMode(policyDecision, effectiveConfig);
    const event = buildEvent(normalizedReq, emitted, durationMs, effectiveConfig);
    const shouldEmit = shouldEmitSecurityEvent(event, effectiveConfig);

    if (effectiveConfig.observability.events.enabled && shouldEmit) {
      events.emitDecision(event);
    }

    if (shouldEmit) {
      telemetry?.recordDecision(event);
    }

    if (effectiveConfig.observability.logs.enabled && shouldEmit && (emitted.action === "block" || emitted.wouldBlock)) {
      writeLog(logger, effectiveConfig, event);
    }

    return emitted;
  }

  async function recordOutcome(req: DhalRequest, outcome: DhalResponseOutcome): Promise<void> {
    try {
      const normalizedReq = normalizeRequest(req, config);
      const context = createRouteSecurityContext(config, normalizedReq.route ?? normalizedReq.path);
      const signal = await recordCredentialOutcome({
        req: normalizedReq,
        config: context.config,
        store: signalStore,
        outcome
      });

      if (signal && context.config.observability.events.enabled) {
        events.emitSignal(signal);
      }
    } catch (error) {
      logger.warn(`[dhal] failed to record response outcome: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    config,
    events,
    inspect,
    recordOutcome
  };
}

async function evaluate(
  req: DhalRequest,
  config: DhalConfig,
  rateLimitStore: RateLimitStore,
  signalStore: DhalSignalStore,
  ipReputation: IpReputationEvaluator
): Promise<DhalDecision> {
  if (config.mode === "off") return allow("Dhal disabled");

  if (isRuntimeBypassed(req, config)) {
    return {
      ...allow("Request bypassed by Dhal runtime policy"),
      ruleId: "runtime.bypass",
      meta: { bypassed: true }
    };
  }

  const ipDecision = evaluateIpRules(req, config);
  if (ipDecision?.action === "allow") return ipDecision;
  if (ipDecision?.action === "block") return ipDecision;

  const honeypotDecision = evaluateHoneypotRule(req, config);
  if (honeypotDecision) return honeypotDecision;

  const headerDecision = evaluateHeaderRules(req, config);
  if (headerDecision) return headerDecision;

  const contentTypeDecision = evaluateContentTypeRule(req, config);
  if (contentTypeDecision) return contentTypeDecision;

  const apiDecision = evaluateApiPositiveSecurityRule(req, config);
  if (apiDecision) return apiDecision;

  const reputationDecision = await ipReputation.evaluate(req);
  if (reputationDecision) return reputationDecision;

  const credentialDecision = await evaluateCredentialStuffingRule({ req, config, store: signalStore });
  if (credentialDecision) return credentialDecision;

  const rateLimitDecision = await evaluateRateLimitRule({ req, config, store: rateLimitStore });
  if (rateLimitDecision) return rateLimitDecision;

  const signatureDecision = evaluateSignatureRules(req, config);
  if (signatureDecision) return signatureDecision;

  const botDecision = evaluateBotRule(req, config);
  if (botDecision) return botDecision;

  return allow("Request allowed");
}

function normalizeRequest(req: DhalRequest, config: DhalConfig): DhalRequest {
  return {
    ...req,
    correlationId: req.correlationId ?? extractCorrelationId(req, config),
    ...extractIdentity(req.headers, config, {
      userId: req.userId,
      tenantId: req.tenantId,
      apiKeyId: req.apiKeyId
    })
  } satisfies DhalRequest;
}

function createTelemetry(config: DhalConfig): DhalTelemetry | undefined {
  const delegates: DhalTelemetry[] = [];

  if (config.observability.otel.enabled) {
    delegates.push(new OpenTelemetryDhalTelemetry({
      serviceName: config.observability.otel.serviceName,
      emitAllowedRequests: config.observability.otel.emitAllowedRequests
    }));
  }

  if (config.observability.webhooks.enabled) {
    delegates.push(new WebhookDhalTelemetry(config.observability.webhooks));
  }

  if (delegates.length === 0) return undefined;
  if (delegates.length === 1) return delegates[0];
  return new CompositeDhalTelemetry(delegates);
}

function enrichDecision(
  decision: DhalDecision,
  config: DhalConfig,
  routePattern: string,
  routeProfile?: DhalRouteProfile | undefined
): DhalDecision {
  return {
    ...decision,
    statusCode: decision.action === "block" && decision.statusCode === config.response.blockStatusCode
      ? config.response.blockStatusCode
      : decision.statusCode,
    meta: {
      ...decision.meta,
      routePattern: decision.meta?.routePattern ?? routePattern,
      routeProfileTags: routeProfile?.tags,
      responseMessage: config.response.message
    }
  };
}

function applyMode(decision: DhalDecision, config: DhalConfig): DhalDecision {
  if (config.mode === "monitor" && decision.action === "block") {
    return {
      ...decision,
      action: "allow",
      statusCode: 200,
      wouldBlock: true
    };
  }

  return decision;
}

function allow(reason: string): DhalDecision {
  return {
    action: "allow",
    statusCode: 200,
    reason,
    score: 0
  };
}

function buildEvent(req: DhalRequest, decision: DhalDecision, durationMs: number, config: DhalConfig): DhalSecurityEvent {
  const ruleCategory = deriveRuleCategory(decision.ruleId);
  const threatKind = typeof decision.meta?.threatKind === "string"
    ? decision.meta.threatKind
    : ruleCategory === "signature" || ruleCategory === "ip" || ruleCategory === "rate_limit"
      ? ruleCategory
      : undefined;
  const safeRequest = redactRequestForObservability(req, config);

  const baseEvent = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId ?? extractCorrelationId(req, config),
    request: safeRequest,
    decision,
    ruleCategory,
    threatKind,
    severity: decision.severity ?? config.policy.severity.default,
    durationMs
  } satisfies Omit<DhalSecurityEvent, "audit">;

  return {
    ...baseEvent,
    audit: config.policy.audit.enabled && (config.policy.audit.includeSuppressed || baseEvent.decision.meta?.suppressed !== true) ? buildAuditExplanation(baseEvent) : undefined
  };
}

function isRuntimeBypassed(req: DhalRequest, config: DhalConfig): boolean {
  if (!config.runtime.bypass.enabled) return false;
  const method = req.method.toUpperCase();
  if (config.runtime.bypass.methods.includes(method)) return true;
  return config.runtime.bypass.paths.some((pattern) => matchesRuntimeBypassPath(req.path, pattern));
}

function matchesRuntimeBypassPath(path: string, pattern: string): boolean {
  if (pattern.endsWith("*")) return path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}

function redactRequestForObservability(req: DhalRequest, config: DhalConfig): DhalSecurityEvent["request"] {
  const redaction = config.observability.redaction;
  if (!redaction.enabled) {
    return {
      method: req.method,
      path: req.path,
      ip: req.ip,
      route: req.route,
      userId: req.userId,
      tenantId: req.tenantId,
      apiKeyId: req.apiKeyId,
      userAgent: getHeader(req.headers, "user-agent")
    };
  }

  return {
    method: req.method,
    path: req.path,
    ip: redactValue(req.ip, redaction.ip, "ip"),
    route: req.route,
    userId: redactValue(req.userId, redaction.identity, "id"),
    tenantId: redactValue(req.tenantId, redaction.identity, "id"),
    apiKeyId: redactValue(req.apiKeyId, redaction.identity, "id"),
    userAgent: redaction.userAgent === "omit" ? undefined : getHeader(req.headers, "user-agent")
  };
}

function redactValue(value: string | undefined, mode: "none" | "mask" | "hash" | "omit", kind: "ip" | "id"): string | undefined {
  if (value === undefined) return undefined;
  if (mode === "none") return value;
  if (mode === "omit") return undefined;
  if (mode === "hash") return `sha256:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
  return kind === "ip" ? maskIp(value) : `${value.slice(0, 3)}…`;
}

function maskIp(ip: string): string {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    return ip.replace(/\.\d+$/, ".0");
  }
  if (ip.includes(":")) {
    const groups = ip.split(":");
    return `${groups.slice(0, 3).join(":")}:…`;
  }
  return "masked";
}

function deriveRuleCategory(ruleId?: string): string {
  if (!ruleId) return "none";
  if (ruleId.startsWith("rate_limit.")) return "rate_limit";
  if (ruleId.startsWith("signature.")) return "signature";
  if (ruleId.startsWith("ip.")) return "ip";
  if (ruleId.startsWith("request.")) return "request";
  if (ruleId.startsWith("bot.")) return "bot";
  if (ruleId.startsWith("header.")) return "header";
  if (ruleId.startsWith("api.")) return "api";
  if (ruleId.startsWith("content_type.")) return "content_type";
  if (ruleId.startsWith("honeypot.")) return "honeypot";
  if (ruleId.startsWith("credential_stuffing.")) return "credential_stuffing";
  return ruleId.split(".")[0] ?? "unknown";
}

function extractCorrelationId(req: DhalRequest, config: DhalConfig): string | undefined {
  for (const header of config.observability.correlation.headers) {
    const value = getHeader(req.headers, header);
    if (value) return value;
  }

  return undefined;
}

function writeLog(logger: Pick<Console, "log" | "warn" | "error">, config: DhalConfig, event: DhalSecurityEvent): void {
  if (config.observability.logs.format === "pretty") {
    logger.warn(
      `[dhal] ${event.decision.wouldBlock ? "would-block" : event.decision.action} ${event.request.method} ${event.request.path} ` +
      `ip=${event.request.ip} route=${String(event.decision.meta?.routePattern ?? event.request.route ?? event.request.path)} ` +
      `rule=${event.decision.ruleId ?? "none"} reason="${event.decision.reason}" event=${event.eventId}`
    );
    return;
  }

  logger.warn(JSON.stringify({ type: "dhal.security_event", ...event }));
}
