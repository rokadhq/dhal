import { DHAL_CONFIG_SCHEMA_VERSION } from "./config.js";

export type DhalV1SurfaceStability = "stable" | "experimental";

export type DhalV1PublicExport = {
  path: string;
  stability: DhalV1SurfaceStability;
  purpose: string;
};

export type DhalV1ContractValidation = {
  ok: boolean;
  issues: string[];
};

export const DHAL_V1_CONTRACT_VERSION = "1" as const;

export const DHAL_V1_PUBLIC_EXPORTS: readonly DhalV1PublicExport[] = Object.freeze([
  { path: ".", stability: "stable", purpose: "Core engine, framework adapters, onboarding, configuration, policies, stores, telemetry, diagnostics, and public types." },
  { path: "./express", stability: "stable", purpose: "Express middleware adapter." },
  { path: "./fastify", stability: "stable", purpose: "Fastify plugin adapter." },
  { path: "./node-http", stability: "stable", purpose: "Raw node:http adapter." },
  { path: "./stores/redis", stability: "stable", purpose: "Distributed Redis/Valkey rate-limit store." },
  { path: "./stores/memory-signal", stability: "stable", purpose: "In-memory security signal store." },
  { path: "./stores/redis-signal", stability: "stable", purpose: "Distributed Redis/Valkey security signal store." },
  { path: "./reputation/abuseipdb", stability: "stable", purpose: "AbuseIPDB-compatible reputation provider." },
  { path: "./telemetry/otel", stability: "stable", purpose: "OpenTelemetry integration." },
  { path: "./telemetry/webhook", stability: "stable", purpose: "Signed webhook telemetry integration." },
  { path: "./config-schema", stability: "stable", purpose: "Programmatic JSON Schema export." },
  { path: "./doctor", stability: "stable", purpose: "Operational diagnostics." },
  { path: "./rules/catalog", stability: "stable", purpose: "Rule catalog inspection." },
  { path: "./presets", stability: "stable", purpose: "Reviewable production configuration presets." },
  { path: "./report", stability: "stable", purpose: "Redacted support report generation." },
  { path: "./compatibility", stability: "stable", purpose: "Runtime and integration compatibility matrix." },
  { path: "./readiness", stability: "stable", purpose: "Production-readiness scoring." },
  { path: "./migrations", stability: "stable", purpose: "Versioned configuration migration utilities." },
  { path: "./stability", stability: "stable", purpose: "Public API stability inventory." },
  { path: "./v1-contract", stability: "stable", purpose: "Machine-readable Dhal v1 contract." },
  { path: "./autosetup", stability: "experimental", purpose: "AI-assisted configuration proposal generation." },
  { path: "./package.json", stability: "stable", purpose: "Package metadata." },
  { path: "./dhal.schema.json", stability: "stable", purpose: "Published configuration schema." }
]);

export const DHAL_V1_CLI_COMMANDS = Object.freeze([
  "init",
  "add",
  "test-config",
  "explain-config",
  "schema",
  "migrate",
  "ci",
  "doctor",
  "report",
  "rules",
  "readiness",
  "compat",
  "stability",
  "release-check",
  "presets",
  "autosetup",
  "replay",
  "simulate"
] as const);

export function getDhalV1Contract() {
  return {
    contractVersion: DHAL_V1_CONTRACT_VERSION,
    configSchemaVersion: DHAL_CONFIG_SCHEMA_VERSION,
    publicExports: DHAL_V1_PUBLIC_EXPORTS,
    cliCommands: DHAL_V1_CLI_COMMANDS,
    compatibilityPolicy: {
      stableExports: "No breaking changes within v1.x without a deprecation and migration path.",
      experimentalExports: "May evolve within v1.x and must remain explicitly labelled experimental.",
      config: "schemaVersion 1 remains backward compatible throughout v1.x.",
      cli: "Stable command names remain available throughout v1.x."
    }
  } as const;
}

export function validateDhalV1Contract(): DhalV1ContractValidation {
  const issues: string[] = [];
  const exportPaths = DHAL_V1_PUBLIC_EXPORTS.map((entry) => entry.path);
  const commandNames = [...DHAL_V1_CLI_COMMANDS];

  if (DHAL_CONFIG_SCHEMA_VERSION !== DHAL_V1_CONTRACT_VERSION) {
    issues.push(`Config schema version ${DHAL_CONFIG_SCHEMA_VERSION} does not match v1 contract ${DHAL_V1_CONTRACT_VERSION}.`);
  }

  for (const duplicate of findDuplicates(exportPaths)) {
    issues.push(`Duplicate v1 public export: ${duplicate}`);
  }

  for (const duplicate of findDuplicates(commandNames)) {
    issues.push(`Duplicate v1 CLI command: ${duplicate}`);
  }

  if (!DHAL_V1_PUBLIC_EXPORTS.some((entry) => entry.path === "." && entry.stability === "stable")) {
    issues.push("The root package export must be stable in v1.");
  }

  return { ok: issues.length === 0, issues };
}

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}
