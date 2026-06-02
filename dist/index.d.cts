export { a as DhalEventBus, c as createDhal } from './engine-CEH7vEA-.cjs';
import { f as DhalConfig, P as PartialDeep, R as RateLimitStore, r as DhalRateLimitConfig, F as IpReputationResult, E as DhalTelemetry, z as DhalSecurityEvent, j as DhalDecision, s as DhalRequest, u as DhalRouteProfile, B as DhalSeverity, h as DhalCredentialStuffingKey } from './types-6Dn0mDWH.cjs';
export { D as DhalAction, a as DhalApiPositiveSecurityConfig, b as DhalAuditExplanation, c as DhalAutosetupOptions, d as DhalAutosetupProvider, e as DhalBotRuleConfig, g as DhalContentTypeConfig, i as DhalCredentialStuffingRuleConfig, k as DhalHeaderAnomalyConfig, l as DhalHeaders, m as DhalHoneypotRuleConfig, n as DhalIdentityKey, o as DhalMode, p as DhalOptions, q as DhalPolicyConfig, t as DhalResponseOutcome, v as DhalRuleConfig, w as DhalRulePackName, x as DhalRuleSuppression, y as DhalSamplingConfig, A as DhalSecuritySignal, C as DhalSignalStore, I as IpReputationProvider } from './types-6Dn0mDWH.cjs';
export { getDhalConfigJsonSchema } from './config-schema.cjs';
export { MemorySignalStore } from './stores/memory-signal-store.cjs';
export { RedisLikeClient, RedisRateLimitStore } from './stores/redis-rate-limit-store.cjs';
export { RedisSignalLikeClient, RedisSignalStore } from './stores/redis-signal-store.cjs';
export { AbuseIpDbProvider, createAbuseIpDbProviderFromConfig } from './reputation/abuseipdb.cjs';
export { OpenTelemetryDhalTelemetry } from './telemetry/otel.cjs';
export { WebhookDhalTelemetry } from './telemetry/webhook.cjs';
export { D as DhalDoctorFinding, a as DhalDoctorOptions, b as DhalDoctorResult, e as evaluateDhalCiPolicy, r as runDhalDoctor } from './doctor-CecDylF1.cjs';
export { runDhalAutosetup } from './autosetup/index.cjs';
export { DHAL_RULE_CATALOG, DhalRuleCatalogEntry, DhalRuleCatalogRow, findDhalRule, getDhalRuleCatalog } from './rules/catalog.cjs';
export { DHAL_PRESETS, DhalPreset, DhalPresetName, DhalPresetSummary, applyDhalPreset, getDhalPreset, listDhalPresets } from './presets.cjs';
export { DhalSupportReport, DhalSupportReportOptions, runDhalSupportReport } from './report.cjs';
export { DHAL_COMPATIBILITY_MATRIX, DHAL_PACKAGE_VERSION, DHAL_RELEASE_CHANNEL, getDhalCompatibilityMatrix } from './compatibility.cjs';
export { DhalReadinessCheck, DhalReadinessOptions, DhalReadinessResult, runDhalReadiness } from './readiness.cjs';
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

export { CompositeDhalTelemetry, DhalConfig, DhalCredentialStuffingKey, DhalDecision, DhalRateLimitConfig, DhalRequest, DhalRouteProfile, DhalSecurityEvent, DhalSeverity, DhalTelemetry, IpReputationCache, IpReputationResult, MemoryRateLimitStore, RateLimitStore, applyPolicyToDecision, buildCredentialKey, defaultConfig, isCredentialRoute, loadDhalConfig, resolveSeverity, severityAtLeast, shouldEmitSecurityEvent };
