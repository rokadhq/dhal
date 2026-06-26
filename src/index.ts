export { createDhal } from "./engine.js";
export { loadDhalConfig, defaultConfig, DHAL_CONFIG_SCHEMA_VERSION } from "./config.js";
export { getDhalConfigJsonSchema } from "./config-schema.js";
export { MemoryRateLimitStore } from "./stores/memory-rate-limit-store.js";
export { MemorySignalStore } from "./stores/memory-signal-store.js";
export { RedisRateLimitStore } from "./stores/redis-rate-limit-store.js";
export { RedisSignalStore } from "./stores/redis-signal-store.js";
export { AbuseIpDbProvider, createAbuseIpDbProviderFromConfig } from "./reputation/abuseipdb.js";
export { IpReputationCache } from "./reputation/cache.js";
export { DhalEventBus } from "./telemetry/events.js";
export { CompositeDhalTelemetry } from "./telemetry/composite.js";
export { OpenTelemetryDhalTelemetry } from "./telemetry/otel.js";
export { WebhookDhalTelemetry } from "./telemetry/webhook.js";
export { evaluateDhalCiPolicy } from "./ci.js";
export { runDhalAutosetup } from "./autosetup/index.js";
export { runDhalDoctor } from "./doctor.js";
export { DHAL_RULE_CATALOG, findDhalRule, getDhalRuleCatalog } from "./rules/catalog.js";
export { DHAL_PRESETS, applyDhalPreset, getDhalPreset, listDhalPresets } from "./presets.js";
export { applyPolicyToDecision, resolveSeverity, shouldEmitSecurityEvent, severityAtLeast } from "./policy.js";
export { buildCredentialKey, isCredentialRoute } from "./rules/credential-stuffing-rule.js";
export type {
  DhalConfigSchemaVersion,
  DhalAction,
  DhalApiPositiveSecurityConfig,
  DhalAutosetupOptions,
  DhalAutosetupProvider,
  DhalBotRuleConfig,
  DhalConfig,
  DhalCredentialStuffingKey,
  DhalCredentialStuffingRuleConfig,
  DhalDecision,
  DhalHeaders,
  DhalHeaderAnomalyConfig,
  DhalHoneypotRuleConfig,
  DhalIdentityKey,
  DhalMode,
  DhalOptions,
  DhalRateLimitConfig,
  DhalRequest,
  DhalResponseOutcome,
  DhalRouteProfile,
  DhalRuleConfig,
  DhalRulePackName,
  DhalContentTypeConfig,
  DhalPolicyConfig,
  DhalRuleSuppression,
  DhalSamplingConfig,
  DhalSeverity,
  DhalAuditExplanation,
  DhalSecurityEvent,
  DhalSecuritySignal,
  DhalSignalStore,
  DhalTelemetry,
  IpReputationProvider,
  IpReputationResult,
  RateLimitStore
} from "./types.js";
export type { RedisLikeClient } from "./stores/redis-rate-limit-store.js";
export type { RedisSignalLikeClient } from "./stores/redis-signal-store.js";
export type { DhalRuleCatalogEntry, DhalRuleCatalogRow } from "./rules/catalog.js";
export type { DhalDoctorFinding, DhalDoctorOptions, DhalDoctorResult } from "./doctor.js";
export type { DhalPreset, DhalPresetName, DhalPresetSummary } from "./presets.js";

export { runDhalSupportReport, type DhalSupportReport, type DhalSupportReportOptions } from "./report.js";
export { DHAL_COMPATIBILITY_MATRIX, DHAL_PACKAGE_VERSION, DHAL_RELEASE_CHANNEL, getDhalCompatibilityMatrix } from "./compatibility.js";
export { runDhalReadiness, type DhalReadinessCheck, type DhalReadinessOptions, type DhalReadinessResult } from "./readiness.js";
export { runDhalReleaseCheck, type DhalReleaseCheckFinding, type DhalReleaseCheckLevel, type DhalReleaseCheckOptions, type DhalReleaseCheckResult, type DhalReleaseTarget } from "./release-check.js";

export { getDhalMigrationPlan, migrateDhalConfig, type DhalMigrationNotice, type DhalMigrationPlan, type DhalMigrationResult } from "./migrations.js";
export { DHAL_API_SURFACES, getDhalApiStabilityReport, type DhalApiStabilityLevel, type DhalApiSurface, type DhalStabilityReport } from "./stability.js";
export {
  DHAL_V1_CLI_COMMANDS,
  DHAL_V1_CONTRACT_VERSION,
  DHAL_V1_PUBLIC_EXPORTS,
  getDhalV1Contract,
  validateDhalV1Contract,
  type DhalV1ContractValidation,
  type DhalV1PublicExport,
  type DhalV1SurfaceStability
} from "./v1-contract.js";
