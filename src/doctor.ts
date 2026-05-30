import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadDhalConfig } from "./config.js";
import { evaluateDhalCiPolicy, type DhalCiFinding } from "./ci.js";
import { getDhalRuleCatalog } from "./rules/catalog.js";
import type { DhalConfig } from "./types.js";

export type DhalDoctorFinding = {
  level: "ok" | "warning" | "error";
  code: string;
  message: string;
  hint?: string | undefined;
};

export type DhalDoctorResult = {
  ok: boolean;
  packageName: "@rokadhq/dhal";
  cli: "dhal";
  configPath: string;
  configExists: boolean;
  nodeVersion: string;
  checks: DhalDoctorFinding[];
  summary?: {
    mode: DhalConfig["mode"];
    routeProfiles: number;
    enabledRules: number;
    rateLimitStore: string;
    webhooksEnabled: boolean;
    otelEnabled: boolean;
    ipReputationEnabled: boolean;
    runtimeBypassEnabled: boolean;
    onInternalError: DhalConfig["runtime"]["onInternalError"];
    redactionEnabled: boolean;
  } | undefined;
  ci?: {
    ok: boolean;
    findings: DhalCiFinding[];
  } | undefined;
};

export type DhalDoctorOptions = {
  configPath?: string | undefined;
  cwd?: string | undefined;
  env?: NodeJS.ProcessEnv | undefined;
};

export function runDhalDoctor(options: DhalDoctorOptions = {}): DhalDoctorResult {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? "dhal.json";
  const resolvedConfigPath = resolve(cwd, configPath);
  const env = options.env ?? process.env;
  const checks: DhalDoctorFinding[] = [];
  const nodeVersion = process.version;

  checkNodeVersion(checks, nodeVersion);

  const configExists = existsSync(resolvedConfigPath);
  if (configExists) {
    checks.push({ level: "ok", code: "config.present", message: `Found ${configPath}.` });
  } else {
    checks.push({
      level: "warning",
      code: "config.missing",
      message: `No ${configPath} found. Dhal will use defaults if loaded from this directory.`,
      hint: "Run `npx dhal init` to create a reviewable config file."
    });
  }

  let config: DhalConfig;
  try {
    config = loadDhalConfig(resolvedConfigPath);
    checks.push({ level: "ok", code: "config.valid", message: "Config loads and validates." });
  } catch (error) {
    checks.push({
      level: "error",
      code: "config.invalid",
      message: error instanceof Error ? error.message : String(error),
      hint: "Run `npx dhal test-config` after fixing the config."
    });

    return {
      ok: false,
      packageName: "@rokadhq/dhal",
      cli: "dhal",
      configPath: resolvedConfigPath,
      configExists,
      nodeVersion,
      checks
    };
  }

  if (config.mode === "monitor") {
    checks.push({
      level: "warning",
      code: "mode.monitor",
      message: "Global mode is monitor; Dhal will not actively block unless a route overrides mode.",
      hint: "Start this way intentionally, then move high-confidence routes to block mode."
    });
  } else if (config.mode === "off") {
    checks.push({ level: "error", code: "mode.off", message: "Global mode is off." });
  } else {
    checks.push({ level: "ok", code: "mode.enforcing", message: `Global mode is ${config.mode}.` });
  }

  if (config.runtime.onInternalError === "allow") {
    checks.push({
      level: "ok",
      code: "runtime.fail_open",
      message: "Internal Dhal errors fail open by default.",
      hint: "For hardened internal APIs, set runtime.onInternalError to block after validating false-positive behavior."
    });
  } else {
    checks.push({ level: "warning", code: "runtime.fail_closed", message: "Internal Dhal errors are configured to fail closed." });
  }

  if (config.runtime.bypass.enabled) {
    checks.push({ level: "ok", code: "runtime.bypass", message: `Runtime bypass is enabled for ${config.runtime.bypass.paths.length} paths and ${config.runtime.bypass.methods.length} methods.` });
  }

  if (config.observability.redaction.enabled) {
    checks.push({ level: "ok", code: "privacy.redaction", message: `Observability redaction is enabled for ip=${config.observability.redaction.ip}, identity=${config.observability.redaction.identity}.` });
  } else {
    checks.push({
      level: "warning",
      code: "privacy.redaction_disabled",
      message: "Observability redaction is disabled.",
      hint: "Enable observability.redaction before sending logs/events to shared systems."
    });
  }

  if (config.trustProxy) {
    checks.push({ level: "ok", code: "proxy.trusted", message: "trustProxy is enabled for proxy-aware client IP extraction." });
  } else {
    checks.push({
      level: "warning",
      code: "proxy.not_trusted",
      message: "trustProxy is disabled.",
      hint: "Enable only when your app is behind a trusted proxy/CDN that sets forwarding headers correctly."
    });
  }

  if (config.rateLimit.enabled && config.rateLimit.store === "memory") {
    checks.push({
      level: "warning",
      code: "rate_limit.memory_store",
      message: "Rate limiting uses the in-memory store.",
      hint: "Use Redis/Valkey for multi-instance or serverless production deployments."
    });
  }

  if (config.ip.reputation.enabled) {
    const apiKey = env[config.ip.reputation.apiKeyEnv];
    if (!apiKey) {
      checks.push({
        level: config.ip.reputation.mode === "blocking" ? "error" : "warning",
        code: "ip_reputation.missing_key",
        message: `IP reputation is enabled but ${config.ip.reputation.apiKeyEnv} is not set.`,
        hint: "Set the environment variable or disable ip.reputation.enabled."
      });
    } else {
      checks.push({ level: "ok", code: "ip_reputation.key_present", message: `Found ${config.ip.reputation.apiKeyEnv}.` });
    }
  }

  if (config.observability.webhooks.enabled) {
    if (config.observability.webhooks.urls.length === 0) {
      checks.push({ level: "error", code: "webhooks.no_targets", message: "Webhooks are enabled but no URLs are configured." });
    }
    if (!config.observability.webhooks.signing.enabled) {
      checks.push({
        level: "warning",
        code: "webhooks.unsigned",
        message: "Webhook alerts are enabled without HMAC signing.",
        hint: "Enable observability.webhooks.signing before sending alerts to shared infrastructure."
      });
    } else if (!env[config.observability.webhooks.signing.secretEnv]) {
      checks.push({
        level: "error",
        code: "webhooks.missing_secret",
        message: `Webhook signing is enabled but ${config.observability.webhooks.signing.secretEnv} is not set.`
      });
    } else {
      checks.push({ level: "ok", code: "webhooks.signing_ready", message: "Webhook signing secret is present." });
    }
  }

  if (config.observability.otel.enabled) {
    checks.push({ level: "ok", code: "otel.enabled", message: "OpenTelemetry emission is enabled." });
  }

  const ci = evaluateDhalCiPolicy(config);
  for (const finding of ci.findings) {
    checks.push({
      level: finding.level === "error" ? "error" : "warning",
      code: `ci.${finding.code}`,
      message: finding.message
    });
  }

  const enabledRules = getDhalRuleCatalog(config).filter((rule) => rule.enabled).length;
  checks.push({ level: "ok", code: "rules.catalog", message: `${enabledRules} rule catalog entries are enabled by the current config.` });

  return {
    ok: checks.every((check) => check.level !== "error"),
    packageName: "@rokadhq/dhal",
    cli: "dhal",
    configPath: resolvedConfigPath,
    configExists,
    nodeVersion,
    checks,
    summary: {
      mode: config.mode,
      routeProfiles: Object.keys(config.routes).length,
      enabledRules,
      rateLimitStore: config.rateLimit.store,
      webhooksEnabled: config.observability.webhooks.enabled,
      otelEnabled: config.observability.otel.enabled,
      ipReputationEnabled: config.ip.reputation.enabled,
      runtimeBypassEnabled: config.runtime.bypass.enabled,
      onInternalError: config.runtime.onInternalError,
      redactionEnabled: config.observability.redaction.enabled
    },
    ci
  };
}

function checkNodeVersion(checks: DhalDoctorFinding[], nodeVersion: string): void {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(nodeVersion);
  if (!match) {
    checks.push({ level: "warning", code: "node.unknown", message: `Could not parse Node version ${nodeVersion}.` });
    return;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const supported = major > 18 || (major === 18 && (minor > 18 || (minor === 18 && patch >= 0)));

  if (supported) {
    checks.push({ level: "ok", code: "node.supported", message: `Node ${nodeVersion} satisfies Dhal's runtime requirement.` });
  } else {
    checks.push({ level: "error", code: "node.unsupported", message: `Node ${nodeVersion} is below Dhal's minimum supported runtime.` });
  }
}
