export { a as DhalEventBus, c as createDhal } from './engine-CXFMqEy1.cjs';
export { D as DHAL_CONFIG_SCHEMA_VERSION, a as DhalMigrationNotice, b as DhalMigrationPlan, c as DhalMigrationResult, d as defaultConfig, g as getDhalMigrationPlan, l as loadDhalConfig, m as migrateDhalConfig } from './migrations-MKToMzKJ.cjs';
export { getDhalConfigJsonSchema } from './config-schema.cjs';
import { R as RateLimitStore, s as DhalRateLimitConfig, G as IpReputationResult, F as DhalTelemetry, A as DhalSecurityEvent, k as DhalDecision, t as DhalRequest, f as DhalConfig, v as DhalRouteProfile, C as DhalSeverity, i as DhalCredentialStuffingKey } from './types-C1dYoaci.cjs';
export { D as DhalAction, a as DhalApiPositiveSecurityConfig, b as DhalAuditExplanation, c as DhalAutosetupOptions, d as DhalAutosetupProvider, e as DhalBotRuleConfig, g as DhalConfigSchemaVersion, h as DhalContentTypeConfig, j as DhalCredentialStuffingRuleConfig, l as DhalHeaderAnomalyConfig, m as DhalHeaders, n as DhalHoneypotRuleConfig, o as DhalIdentityKey, p as DhalMode, q as DhalOptions, r as DhalPolicyConfig, u as DhalResponseOutcome, w as DhalRuleConfig, x as DhalRulePackName, y as DhalRuleSuppression, z as DhalSamplingConfig, B as DhalSecuritySignal, E as DhalSignalStore, I as IpReputationProvider } from './types-C1dYoaci.cjs';
export { MemorySignalStore } from './stores/memory-signal-store.cjs';
export { RedisLikeClient, RedisRateLimitStore } from './stores/redis-rate-limit-store.cjs';
export { RedisSignalLikeClient, RedisSignalStore } from './stores/redis-signal-store.cjs';
export { AbuseIpDbProvider, createAbuseIpDbProviderFromConfig } from './reputation/abuseipdb.cjs';
export { OpenTelemetryDhalTelemetry } from './telemetry/otel.cjs';
export { WebhookDhalTelemetry } from './telemetry/webhook.cjs';
export { D as DhalDoctorFinding, a as DhalDoctorOptions, b as DhalDoctorResult, e as evaluateDhalCiPolicy, r as runDhalDoctor } from './doctor-CBcTSQd5.cjs';
export { runDhalAutosetup } from './autosetup/index.cjs';
export { DHAL_RULE_CATALOG, DhalRuleCatalogEntry, DhalRuleCatalogRow, findDhalRule, getDhalRuleCatalog } from './rules/catalog.cjs';
export { DHAL_PRESETS, DhalPreset, DhalPresetName, DhalPresetSummary, applyDhalPreset, getDhalPreset, listDhalPresets } from './presets.cjs';
export { DhalSupportReport, DhalSupportReportOptions, runDhalSupportReport } from './report.cjs';
export { DHAL_COMPATIBILITY_MATRIX, DHAL_PACKAGE_VERSION, DHAL_RELEASE_CHANNEL, getDhalCompatibilityMatrix } from './compatibility.cjs';
export { DhalReadinessCheck, DhalReadinessOptions, DhalReadinessResult, runDhalReadiness } from './readiness.cjs';
export { DHAL_API_SURFACES, DhalApiStabilityLevel, DhalApiSurface, DhalStabilityReport, getDhalApiStabilityReport } from './stability.cjs';
import 'node:events';

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

export { CompositeDhalTelemetry, DhalConfig, DhalCredentialStuffingKey, DhalDecision, DhalRateLimitConfig, DhalRequest, DhalRouteProfile, DhalSecurityEvent, DhalSeverity, DhalTelemetry, IpReputationCache, IpReputationResult, MemoryRateLimitStore, RateLimitStore, applyPolicyToDecision, buildCredentialKey, isCredentialRoute, resolveSeverity, severityAtLeast, shouldEmitSecurityEvent };
