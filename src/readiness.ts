import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateDhalCiPolicy } from "./ci.js";
import { loadDhalConfig } from "./config.js";
import { getDhalCompatibilityMatrix } from "./compatibility.js";
import { runDhalDoctor } from "./doctor.js";
import { getDhalRuleCatalog } from "./rules/catalog.js";
import type { DhalConfig } from "./types.js";

export type DhalReadinessLevel = "pass" | "warn" | "fail";

export type DhalReadinessCheck = {
  code: string;
  level: DhalReadinessLevel;
  message: string;
  hint?: string | undefined;
  points: number;
};

export type DhalReadinessOptions = {
  configPath?: string | undefined;
  cwd?: string | undefined;
  env?: NodeJS.ProcessEnv | undefined;
  production?: boolean | undefined;
  minScore?: number | undefined;
};

export type DhalReadinessResult = {
  ok: boolean;
  packageName: "@rokadhq/dhal";
  version: string;
  releaseChannel: string;
  target: "development" | "production";
  minScore: number;
  score: number;
  maxScore: number;
  configPath: string;
  configExists: boolean;
  summary?: {
    mode: DhalConfig["mode"];
    routeProfiles: number;
    enforcingRoutes: number;
    enabledRules: number;
    rateLimitStore: DhalConfig["rateLimit"]["store"];
    trustProxy: boolean;
    redactionEnabled: boolean;
    webhooksEnabled: boolean;
    webhookSigningEnabled: boolean;
    runtimeBypassEnabled: boolean;
    onInternalError: DhalConfig["runtime"]["onInternalError"];
  } | undefined;
  checks: DhalReadinessCheck[];
};

const BASE_SCORE = 100;

export function runDhalReadiness(options: DhalReadinessOptions = {}): DhalReadinessResult {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? "dhal.json";
  const resolvedConfigPath = resolve(cwd, configPath);
  const production = Boolean(options.production);
  const minScore = options.minScore ?? (production ? 85 : 70);
  const compatibility = getDhalCompatibilityMatrix();
  const checks: DhalReadinessCheck[] = [];
  const configExists = existsSync(resolvedConfigPath);

  if (!configExists) {
    checks.push({
      code: "config.missing",
      level: production ? "fail" : "warn",
      message: `No ${configPath} file found.`,
      hint: "Run `npx dhal init` or `npx dhal presets apply starter --write`.",
      points: production ? -25 : -10
    });
  } else {
    checks.push({ code: "config.present", level: "pass", message: `Found ${configPath}.`, points: 0 });
  }

  let config: DhalConfig;
  try {
    config = loadDhalConfig(resolvedConfigPath);
    checks.push({ code: "config.valid", level: "pass", message: "Config loads and validates.", points: 0 });
  } catch (error) {
    checks.push({
      code: "config.invalid",
      level: "fail",
      message: error instanceof Error ? error.message : String(error),
      hint: "Run `npx dhal test-config` and fix validation errors before release.",
      points: -60
    });

    const score = clampScore(BASE_SCORE + sumPoints(checks));
    return {
      ok: false,
      packageName: "@rokadhq/dhal",
      version: compatibility.version,
      releaseChannel: compatibility.releaseChannel,
      target: production ? "production" : "development",
      minScore,
      score,
      maxScore: BASE_SCORE,
      configPath: resolvedConfigPath,
      configExists,
      checks
    };
  }

  addModeChecks(config, checks, production);
  addRouteChecks(config, checks, production);
  addStoreChecks(config, checks, production);
  addRuntimeChecks(config, checks, production);
  addObservabilityChecks(config, checks, production, options.env ?? process.env);
  addPolicyChecks(config, checks, production);
  addRulesChecks(config, checks);

  const doctor = runDhalDoctor({ configPath: resolvedConfigPath, env: options.env });
  if (!doctor.ok) {
    checks.push({
      code: "doctor.needs_attention",
      level: "warn",
      message: "Dhal doctor reported errors or warnings that should be reviewed.",
      hint: "Run `npx dhal doctor --json` for the full diagnostic report.",
      points: production ? -10 : -5
    });
  }

  const score = clampScore(BASE_SCORE + sumPoints(checks));
  const hardFailures = checks.some((check) => check.level === "fail");
  const enforcingRoutes = Object.values(config.routes).filter((route) => route.enabled !== false && (route.mode === "block" || route.mode === "strict")).length;

  return {
    ok: !hardFailures && score >= minScore,
    packageName: "@rokadhq/dhal",
    version: compatibility.version,
    releaseChannel: compatibility.releaseChannel,
    target: production ? "production" : "development",
    minScore,
    score,
    maxScore: BASE_SCORE,
    configPath: resolvedConfigPath,
    configExists,
    summary: {
      mode: config.mode,
      routeProfiles: Object.keys(config.routes).length,
      enforcingRoutes,
      enabledRules: getDhalRuleCatalog(config).filter((rule) => rule.enabled).length,
      rateLimitStore: config.rateLimit.store,
      trustProxy: config.trustProxy,
      redactionEnabled: config.observability.redaction.enabled,
      webhooksEnabled: config.observability.webhooks.enabled,
      webhookSigningEnabled: config.observability.webhooks.signing.enabled,
      runtimeBypassEnabled: config.runtime.bypass.enabled,
      onInternalError: config.runtime.onInternalError
    },
    checks
  };
}

function addModeChecks(config: DhalConfig, checks: DhalReadinessCheck[], production: boolean): void {
  if (config.mode === "off") {
    checks.push({ code: "mode.off", level: "fail", message: "Global mode is off.", hint: "Use monitor globally and block/strict per route when ready.", points: -40 });
    return;
  }

  if (config.mode === "monitor") {
    checks.push({ code: "mode.monitor", level: "warn", message: "Global mode is monitor.", hint: "This is correct for rollout; add route-level block mode for high-confidence endpoints.", points: production ? -8 : 0 });
    return;
  }

  checks.push({ code: "mode.enforcing", level: "pass", message: `Global mode is ${config.mode}.`, points: 0 });
}

function addRouteChecks(config: DhalConfig, checks: DhalReadinessCheck[], production: boolean): void {
  const routeProfiles = Object.values(config.routes).filter((route) => route.enabled !== false);
  const enforcingRoutes = routeProfiles.filter((route) => route.mode === "block" || route.mode === "strict");

  if (routeProfiles.length === 0) {
    checks.push({ code: "routes.none", level: production ? "warn" : "pass", message: "No route-specific profiles are configured.", hint: "Add profiles for /api/login, upload, private API, and admin surfaces before v1.", points: production ? -8 : 0 });
    return;
  }

  if (enforcingRoutes.length === 0 && config.mode === "monitor") {
    checks.push({ code: "routes.no_enforcement", level: production ? "warn" : "pass", message: "Route profiles exist but none are in block/strict mode.", hint: "Enable block mode on high-confidence routes after replaying false positives.", points: production ? -10 : 0 });
    return;
  }

  checks.push({ code: "routes.enforcing", level: "pass", message: `${enforcingRoutes.length} route profile(s) are enforcing.`, points: 0 });
}

function addStoreChecks(config: DhalConfig, checks: DhalReadinessCheck[], production: boolean): void {
  if (!config.rateLimit.enabled) {
    checks.push({ code: "rate_limit.disabled", level: production ? "warn" : "pass", message: "Rate limiting is disabled.", hint: "Enable rate limiting for public APIs before v1 production usage.", points: production ? -8 : 0 });
    return;
  }

  if (config.rateLimit.store === "memory" && production) {
    checks.push({ code: "rate_limit.memory", level: "warn", message: "Rate limiting uses memory store in production target.", hint: "Use Redis/Valkey for multi-instance, serverless, or horizontally scaled deployments.", points: -8 });
    return;
  }

  checks.push({ code: "rate_limit.ready", level: "pass", message: `Rate limiting is enabled with ${config.rateLimit.store} store.`, points: 0 });
}

function addRuntimeChecks(config: DhalConfig, checks: DhalReadinessCheck[], production: boolean): void {
  if (config.runtime.maxInspectionMs > 100 && production) {
    checks.push({ code: "runtime.high_max_inspection", level: "warn", message: "runtime.maxInspectionMs is above 100ms.", hint: "Keep hot-path inspection budget low for public APIs.", points: -5 });
  }

  if (!config.runtime.bypass.enabled && production) {
    checks.push({ code: "runtime.no_bypass", level: "warn", message: "Runtime bypass is disabled.", hint: "Health, readiness, liveness, and OPTIONS preflight routes should normally bypass WAF inspection.", points: -5 });
  } else {
    checks.push({ code: "runtime.bypass", level: "pass", message: "Runtime bypass is configured.", points: 0 });
  }

  if (config.runtime.onInternalError === "block" && config.mode !== "strict") {
    checks.push({ code: "runtime.fail_closed", level: "warn", message: "Internal Dhal errors fail closed.", hint: "Only use fail-closed after proving store/telemetry reliability under load.", points: -4 });
  }
}

function addObservabilityChecks(config: DhalConfig, checks: DhalReadinessCheck[], production: boolean, env: NodeJS.ProcessEnv): void {
  if (!config.observability.redaction.enabled) {
    checks.push({ code: "privacy.redaction_disabled", level: production ? "fail" : "warn", message: "Observability redaction is disabled.", hint: "Enable redaction before sending diagnostics/events to shared systems.", points: production ? -30 : -10 });
  } else {
    checks.push({ code: "privacy.redaction", level: "pass", message: "Observability redaction is enabled.", points: 0 });
  }

  if (config.observability.webhooks.enabled) {
    if (!config.observability.webhooks.signing.enabled) {
      checks.push({ code: "webhooks.unsigned", level: production ? "fail" : "warn", message: "Webhook alerts are enabled without signing.", hint: "Enable HMAC signing before production alert delivery.", points: production ? -25 : -10 });
    } else if (!env[config.observability.webhooks.signing.secretEnv]) {
      checks.push({ code: "webhooks.missing_secret", level: production ? "fail" : "warn", message: `Webhook signing is enabled but ${config.observability.webhooks.signing.secretEnv} is not set.`, points: production ? -25 : -10 });
    } else {
      checks.push({ code: "webhooks.signed", level: "pass", message: "Webhook signing is configured and secret is present.", points: 0 });
    }
  }

  if (config.ip.reputation.enabled && config.ip.reputation.mode === "blocking" && !env[config.ip.reputation.apiKeyEnv]) {
    checks.push({ code: "ip_reputation.blocking_missing_key", level: production ? "fail" : "warn", message: `Blocking IP reputation is enabled but ${config.ip.reputation.apiKeyEnv} is not set.`, points: production ? -25 : -10 });
  }
}

function addPolicyChecks(config: DhalConfig, checks: DhalReadinessCheck[], production: boolean): void {
  const ci = evaluateDhalCiPolicy(config);
  for (const finding of ci.findings) {
    checks.push({
      code: `ci.${finding.code}`,
      level: finding.level === "error" ? "fail" : "warn",
      message: finding.message,
      points: finding.level === "error" ? -20 : (production ? -6 : -2)
    });
  }

  if (config.policy.audit.enabled) {
    checks.push({ code: "policy.audit", level: "pass", message: "Policy audit explanations are enabled.", points: 0 });
  } else if (production) {
    checks.push({ code: "policy.audit_disabled", level: "warn", message: "Policy audit explanations are disabled.", hint: "Keep audit enabled through beta and v1 rollout.", points: -5 });
  }
}

function addRulesChecks(config: DhalConfig, checks: DhalReadinessCheck[]): void {
  const enabledRules = getDhalRuleCatalog(config).filter((rule) => rule.enabled).length;
  if (enabledRules === 0) {
    checks.push({ code: "rules.none", level: "fail", message: "No rule catalog entries are enabled.", points: -40 });
    return;
  }
  checks.push({ code: "rules.enabled", level: "pass", message: `${enabledRules} rule catalog entries are enabled.`, points: 0 });
}

function sumPoints(checks: DhalReadinessCheck[]): number {
  return checks.reduce((sum, check) => sum + check.points, 0);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(BASE_SCORE, Math.round(score)));
}
