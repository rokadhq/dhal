import { evaluateDhalCiPolicy } from "./ci.js";
import { loadDhalConfig } from "./config.js";
import { runDhalDoctor, type DhalDoctorResult } from "./doctor.js";
import { getDhalRuleCatalog, type DhalRuleCatalogEntry } from "./rules/catalog.js";
import type { DhalConfig } from "./types.js";

export type DhalSupportReport = {
  generatedAt: string;
  packageName: "@rokadhq/dhal";
  cli: "dhal";
  configPath: string;
  runtime: {
    node: string;
    platform: NodeJS.Platform;
    arch: string;
  };
  config: {
    mode: DhalConfig["mode"];
    trustProxy: boolean;
    routeProfiles: number;
    rateLimitStore: string;
    ipReputationEnabled: boolean;
    otelEnabled: boolean;
    webhooksEnabled: boolean;
    redactionEnabled: boolean;
    runtimeBypassEnabled: boolean;
    onInternalError: DhalConfig["runtime"]["onInternalError"];
  };
  env: {
    abuseIpDbKeyPresent: boolean;
    webhookSecretPresent: boolean;
  };
  doctor: DhalDoctorResult;
  ci: ReturnType<typeof evaluateDhalCiPolicy>;
  enabledRules: DhalRuleCatalogEntry[];
};

export type DhalSupportReportOptions = {
  configPath?: string | undefined;
  env?: NodeJS.ProcessEnv | undefined;
};

export function runDhalSupportReport(options: DhalSupportReportOptions = {}): DhalSupportReport {
  const configPath = options.configPath ?? "dhal.json";
  const env = options.env ?? process.env;
  const config = loadDhalConfig(configPath);
  const doctor = runDhalDoctor({ configPath, env });
  const ci = evaluateDhalCiPolicy(config);
  const enabledRules = getDhalRuleCatalog(config).filter((rule) => rule.enabled);

  return {
    generatedAt: new Date().toISOString(),
    packageName: "@rokadhq/dhal",
    cli: "dhal",
    configPath,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    },
    config: {
      mode: config.mode,
      trustProxy: config.trustProxy,
      routeProfiles: Object.keys(config.routes).length,
      rateLimitStore: config.rateLimit.store,
      ipReputationEnabled: config.ip.reputation.enabled,
      otelEnabled: config.observability.otel.enabled,
      webhooksEnabled: config.observability.webhooks.enabled,
      redactionEnabled: config.observability.redaction.enabled,
      runtimeBypassEnabled: config.runtime.bypass.enabled,
      onInternalError: config.runtime.onInternalError
    },
    env: {
      abuseIpDbKeyPresent: Boolean(env[config.ip.reputation.apiKeyEnv]),
      webhookSecretPresent: Boolean(env[config.observability.webhooks.signing.secretEnv])
    },
    doctor,
    ci,
    enabledRules
  };
}
