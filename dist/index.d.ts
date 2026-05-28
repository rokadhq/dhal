export { a as DhalEventBus, c as createDhal } from './engine-DZ0jvLHu.js';
import { f as DhalConfig, P as PartialDeep, R as RateLimitStore, r as DhalRateLimitConfig, F as IpReputationResult, E as DhalTelemetry, z as DhalSecurityEvent, j as DhalDecision, s as DhalRequest, u as DhalRouteProfile, B as DhalSeverity, h as DhalCredentialStuffingKey } from './types-CX1y5ozy.js';
export { D as DhalAction, a as DhalApiPositiveSecurityConfig, b as DhalAuditExplanation, c as DhalAutosetupOptions, d as DhalAutosetupProvider, e as DhalBotRuleConfig, g as DhalContentTypeConfig, i as DhalCredentialStuffingRuleConfig, k as DhalHeaderAnomalyConfig, l as DhalHeaders, m as DhalHoneypotRuleConfig, n as DhalIdentityKey, o as DhalMode, p as DhalOptions, q as DhalPolicyConfig, t as DhalResponseOutcome, v as DhalRuleConfig, w as DhalRulePackName, x as DhalRuleSuppression, y as DhalSamplingConfig, A as DhalSecuritySignal, C as DhalSignalStore, I as IpReputationProvider } from './types-CX1y5ozy.js';
export { getDhalConfigJsonSchema } from './config-schema.js';
export { MemorySignalStore } from './stores/memory-signal-store.js';
export { RedisLikeClient, RedisRateLimitStore } from './stores/redis-rate-limit-store.js';
export { RedisSignalLikeClient, RedisSignalStore } from './stores/redis-signal-store.js';
export { AbuseIpDbProvider, createAbuseIpDbProviderFromConfig } from './reputation/abuseipdb.js';
export { OpenTelemetryDhalTelemetry } from './telemetry/otel.js';
export { WebhookDhalTelemetry } from './telemetry/webhook.js';
export { runDhalAutosetup } from './autosetup/index.js';
import 'node:events';

declare const defaultConfig: DhalConfig;
declare function loadDhalConfig(configPath?: string, override?: PartialDeep<DhalConfig>): DhalConfig;

declare class MemoryRateLimitStore implements RateLimitStore {
    private readonly buckets;
    consume(key: string, limit: DhalRateLimitConfig): Promise<{
        allowed: boolean;
        remaining: number;
        resetAt: number;
    }>;
    private sweep;
}

declare class IpReputationCache {
    private readonly entries;
    private readonly inFlight;
    get(ip: string): IpReputationResult | undefined;
    set(ip: string, result: IpReputationResult): void;
    markInFlight(ip: string): boolean;
    clearInFlight(ip: string): void;
    size(): number;
}

declare class CompositeDhalTelemetry implements DhalTelemetry {
    private readonly delegates;
    constructor(delegates: DhalTelemetry[]);
    recordDecision(event: DhalSecurityEvent): void;
}

type DhalCiFinding = {
    level: "error" | "warning";
    code: string;
    message: string;
};
type DhalCiResult = {
    ok: boolean;
    findings: DhalCiFinding[];
};
declare function evaluateDhalCiPolicy(config: DhalConfig): DhalCiResult;

type DhalPolicyEvaluationContext = {
    req: DhalRequest;
    config: DhalConfig;
    routePattern: string;
    routeProfile?: DhalRouteProfile | undefined;
    ruleCategory: string;
};
declare function applyPolicyToDecision(decision: DhalDecision, context: DhalPolicyEvaluationContext): DhalDecision;
declare function resolveSeverity(decision: DhalDecision, config: DhalConfig, ruleCategory: string): DhalSeverity;
declare function shouldEmitSecurityEvent(event: DhalSecurityEvent, config: DhalConfig): boolean;
declare function severityAtLeast(actual: DhalSeverity, minimum: DhalSeverity): boolean;

declare function isCredentialRoute(req: DhalRequest, config: DhalConfig): boolean;
declare function buildCredentialKey(req: DhalRequest, keyBy: DhalCredentialStuffingKey[]): string;

export { CompositeDhalTelemetry, DhalConfig, DhalCredentialStuffingKey, DhalDecision, DhalRateLimitConfig, DhalRequest, DhalRouteProfile, DhalSecurityEvent, DhalSeverity, DhalTelemetry, IpReputationCache, IpReputationResult, MemoryRateLimitStore, RateLimitStore, applyPolicyToDecision, buildCredentialKey, defaultConfig, evaluateDhalCiPolicy, isCredentialRoute, loadDhalConfig, resolveSeverity, severityAtLeast, shouldEmitSecurityEvent };
