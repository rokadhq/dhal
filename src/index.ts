export { createDhal, type DhalEngine, type DhalRuntimeSnapshot } from "./engine.js";
export { loadDhalConfig, defaultConfig, DHAL_CONFIG_SCHEMA_VERSION } from "./config.js";
export { getDhalConfigJsonSchema } from "./config-schema.js";
export { MemoryRateLimitStore } from "./stores/memory-rate-limit-store.js";
export { MemorySignalStore } from "./stores/memory-signal-store.js";
export { RedisRateLimitStore } from "./stores/redis-rate-limit-store.js";
export { RedisSignalStore } from "./stores/redis-signal-store.js";
export { AbuseIpDbProvider, createAbuseIpDbProviderFromConfig } from "./reputation/abuseipdb.js";
export { IpReputationCache } from "./reputation/cache.js";
export { DhalEventBus, type DhalEventListenerError } from "./telemetry/events.js";
export { CompositeDhalTelemetry } from "./telemetry/composite.js";
export { OpenTelemetryDhalTelemetry } from "./telemetry/otel.js";
export { WebhookDhalTelemetry, type WebhookDhalTelemetryOptions } from "./telemetry/webhook.js";
export {
  closeDhalTelemetry,
  flushDhalTelemetry,
  getDhalTelemetryHealth,
  type DhalManagedTelemetry,
  type DhalTelemetryHealth
} from "./telemetry/lifecycle.js";
export { evaluateDhalCiPolicy } from "./ci.js";
export { runDhalAutosetup } from "./autosetup/index.js";
export {
  detectFramework,
  detectPackageManager,
  runDhalAdd,
  type DhalAddFilePlan,
  type DhalAddOptions,
  type DhalAddResult,
  type DhalFramework,
  type DhalPackageManager
} from "./add.js";
export { runDhalDoctor } from "./doctor.js";
export {
  runDhalDoctorFix,
  type DhalDoctorFixAction,
  type DhalDoctorFixOptions,
  type DhalDoctorFixResult
} from "./doctor-fix.js";
export {
  DHAL_FRAMEWORK_PRESETS,
  applyDhalFrameworkPreset,
  getDhalFrameworkPreset,
  isFrameworkPresetName,
  listDhalFrameworkPresets,
  type DhalFrameworkPreset,
  type DhalFrameworkPresetName,
  type DhalFrameworkPresetSummary
} from "./framework-presets.js";
export {
  generateDhalPolicyFromOpenApi,
  generateDhalPolicyFromOpenApiFile,
  inspectOpenApi,
  inspectOpenApiFile,
  openApiPathToDhalRoute,
  type DhalOpenApiFormat,
  type DhalOpenApiInspection,
  type DhalOpenApiOperation,
  type DhalOpenApiPolicyChange,
  type DhalOpenApiPolicyOptions,
  type DhalOpenApiPolicyResult,
  type DhalOpenApiSecurity,
  type DhalOpenApiSignal
} from "./openapi.js";
export { DHAL_RULE_CATALOG, findDhalRule, getDhalRuleCatalog } from "./rules/catalog.js";
export { DHAL_PRESETS, applyDhalPreset, getDhalPreset, listDhalPresets } from "./presets.js";
export { applyPolicyToDecision, resolveSeverity, shouldEmitSecurityEvent, severityAtLeast } from "./policy.js";
export { buildCredentialKey, isCredentialRoute } from "./rules/credential-stuffing-rule.js";
export {
  installDhalNest,
  installDhalNestFromEngine,
  type DhalNestApplication,
  type DhalNestHttpAdapter,
  type DhalNestInstallation,
  type DhalNestInstallFromEngineOptions,
  type DhalNestInstallOptions,
  type DhalNestPlatform
} from "./adapters/nest.js";
export {
  dhalKoa,
  dhalKoaFromEngine,
  type DhalKoaContext,
  type DhalKoaMiddleware,
  type DhalKoaNext
} from "./adapters/koa.js";
export {
  dhalHono,
  dhalHonoFromEngine,
  type DhalHonoContext,
  type DhalHonoMiddleware,
  type DhalHonoNext,
  type DhalHonoRequest
} from "./adapters/hono.js";
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
