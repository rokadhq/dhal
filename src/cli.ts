#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultConfig, loadDhalConfig } from "./config.js";
import { evaluateDhalCiPolicy } from "./ci.js";
import { getDhalConfigJsonSchema } from "./config-schema.js";
import { createDhal } from "./engine.js";
import { runDhalAutosetup } from "./autosetup/index.js";
import { runDhalDoctor } from "./doctor.js";
import { getDhalRuleCatalog } from "./rules/catalog.js";
import { applyDhalPreset, getDhalPreset, listDhalPresets, readConfigIfExists } from "./presets.js";
import { runDhalSupportReport } from "./report.js";
import type { DhalAutosetupProvider, DhalDecision, DhalRequest } from "./types.js";
import { extractIdentity } from "./utils/identity.js";

const [, , command, ...args] = process.argv;

type ParsedArgs = {
  positional: string[];
  configPath?: string | undefined;
  json?: boolean | undefined;
  provider?: string | undefined;
  model?: string | undefined;
  write?: boolean | undefined;
  noAi?: boolean | undefined;
  outputPath?: string | undefined;
  maxFiles?: number | undefined;
  maxBytesPerFile?: number | undefined;
  providerModule?: string | undefined;
  providerExport?: string | undefined;
  failOnBlock?: boolean | undefined;
};

type SimulationRequest = DhalRequest & {
  responseStatus?: number | undefined;
};

type ReplayFixture = (DhalRequest & {
  name?: string | undefined;
  expected?: "allow" | "block" | "would-block" | undefined;
  expectedAction?: "allow" | "block" | "would-block" | undefined;
}) | {
  name?: string | undefined;
  request: DhalRequest;
  expected?: "allow" | "block" | "would-block" | undefined;
};

async function main(): Promise<void> {
  const parsed = parseArgs(args);

  switch (command) {
    case "init":
      initConfig(parsed.positional[0]);
      return;
    case "test-config":
      testConfig(parsed.configPath ?? parsed.positional[0]);
      return;
    case "simulate":
      await simulate(parsed.positional[0], parsed.configPath, Boolean(parsed.json));
      return;
    case "replay":
      await replay(parsed.positional[0], parsed.configPath, Boolean(parsed.json), Boolean(parsed.failOnBlock));
      return;
    case "autosetup":
      await autosetup(parsed);
      return;
    case "explain-config":
      explainConfig(parsed.configPath ?? parsed.positional[0]);
      return;
    case "schema":
    case "export-schema":
      exportSchema(parsed.positional[0]);
      return;
    case "migrate":
      migrateConfig(parsed.positional[0], parsed.positional[1]);
      return;
    case "ci":
      runCi(parsed.configPath ?? parsed.positional[0], Boolean(parsed.json));
      return;
    case "doctor":
      runDoctor(parsed.configPath ?? parsed.positional[0], Boolean(parsed.json));
      return;
    case "report":
      runReport(parsed.configPath ?? parsed.positional[0], Boolean(parsed.json), parsed.outputPath);
      return;
    case "rules":
      listRules(parsed.configPath, Boolean(parsed.json));
      return;
    case "presets":
    case "preset":
      handlePresets(parsed);
      return;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

function parseArgs(values: string[]): ParsedArgs {
  const parsed: ParsedArgs = { positional: [] };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--config") {
      parsed.configPath = values[index + 1];
      index += 1;
    } else if (value === "--json") {
      parsed.json = true;
    } else if (value === "--provider") {
      parsed.provider = values[index + 1];
      index += 1;
    } else if (value === "--model") {
      parsed.model = values[index + 1];
      index += 1;
    } else if (value === "--write") {
      parsed.write = true;
    } else if (value === "--no-ai") {
      parsed.noAi = true;
    } else if (value === "--output") {
      parsed.outputPath = values[index + 1];
      index += 1;
    } else if (value === "--max-files") {
      parsed.maxFiles = Number(values[index + 1]);
      index += 1;
    } else if (value === "--max-bytes-per-file") {
      parsed.maxBytesPerFile = Number(values[index + 1]);
      index += 1;
    } else if (value === "--provider-module") {
      parsed.providerModule = values[index + 1];
      index += 1;
    } else if (value === "--provider-export") {
      parsed.providerExport = values[index + 1];
      index += 1;
    } else if (value === "--fail-on-block") {
      parsed.failOnBlock = true;
    } else if (value !== undefined) {
      parsed.positional.push(value);
    }
  }

  return parsed;
}

function initConfig(path = "dhal.json"): void {
  const resolved = resolve(process.cwd(), path);
  if (existsSync(resolved)) {
    console.error(`Refusing to overwrite existing config: ${resolved}`);
    process.exitCode = 1;
    return;
  }

  writeFileSync(resolved, `${JSON.stringify(defaultConfig, null, 2)}\n`);
  console.log(`Created ${resolved}`);
}

function exportSchema(path?: string): void {
  const schema = JSON.stringify(getDhalConfigJsonSchema(), null, 2);
  if (path) {
    const resolved = resolve(process.cwd(), path);
    writeFileSync(resolved, `${schema}\n`);
    console.log(`Created ${resolved}`);
    return;
  }

  console.log(schema);
}

function migrateConfig(inputPath = "dhal.json", outputPath?: string): void {
  const config = loadDhalConfig(inputPath);
  const serialized = `${JSON.stringify(config, null, 2)}
`;

  if (outputPath) {
    const resolved = resolve(process.cwd(), outputPath);
    writeFileSync(resolved, serialized);
    console.log(`Created migrated config ${resolved}`);
    return;
  }

  console.log(serialized);
}

function runCi(path = "dhal.json", json = false): void {
  const config = loadDhalConfig(path);
  const result = evaluateDhalCiPolicy(config);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.findings.length === 0) {
    console.log("Dhal CI: ok");
  } else {
    console.log(`Dhal CI: ${result.ok ? "passed with warnings" : "failed"}`);
    for (const finding of result.findings) {
      console.log(`${finding.level.toUpperCase()} ${finding.code}: ${finding.message}`);
    }
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}


function runReport(path = "dhal.json", json = false, outputPath?: string): void {
  const report = runDhalSupportReport({ configPath: path });
  const serialized = `${JSON.stringify(report, null, 2)}
`;

  if (outputPath) {
    const target = resolve(process.cwd(), outputPath);
    writeFileSync(target, serialized);
    if (json) console.log(JSON.stringify({ ok: true, wrote: target }, null, 2));
    else console.log(`Created Dhal support report ${target}`);
    return;
  }

  if (json) {
    console.log(serialized);
    return;
  }

  console.log(`Dhal report: ${report.packageName}`);
  console.log(`Node: ${report.runtime.node} ${report.runtime.platform}/${report.runtime.arch}`);
  console.log(`Config: ${report.configPath}`);
  console.log(`Mode: ${report.config.mode}`);
  console.log(`Route profiles: ${report.config.routeProfiles}`);
  console.log(`Enabled rules: ${report.enabledRules.length}`);
  console.log(`Doctor: ${report.doctor.ok ? "ok" : "needs attention"}`);
  console.log(`CI: ${report.ci.ok ? "ok" : "failed"}`);
  console.log("No secrets are included. Use --json or --output dhal.report.json for support/debugging.");
}

function runDoctor(path = "dhal.json", json = false): void {
  const result = runDhalDoctor({ configPath: path });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Dhal doctor: ${result.ok ? "ok" : "needs attention"}`);
    console.log(`Package: ${result.packageName}`);
    console.log(`CLI: ${result.cli}`);
    console.log(`Config: ${result.configPath}`);
    if (result.summary) {
      console.log(`Mode: ${result.summary.mode}`);
      console.log(`Route profiles: ${result.summary.routeProfiles}`);
      console.log(`Enabled catalog rules: ${result.summary.enabledRules}`);
      console.log(`Rate limit store: ${result.summary.rateLimitStore}`);
    }
    for (const check of result.checks) {
      const prefix = check.level === "ok" ? "OK" : check.level === "warning" ? "WARN" : "ERROR";
      console.log(`${prefix} ${check.code}: ${check.message}`);
      if (check.hint) console.log(`  hint: ${check.hint}`);
    }
  }

  if (!result.ok) process.exitCode = 1;
}

function listRules(configPath: string | undefined, json = false): void {
  const config = configPath ? loadDhalConfig(configPath) : loadDhalConfig("dhal.json");
  const rules = getDhalRuleCatalog(config);

  if (json) {
    console.log(JSON.stringify({ rules }, null, 2));
    return;
  }

  console.log(`Dhal rules: ${rules.length} catalog entries`);
  for (const rule of rules) {
    const enabled = rule.enabled ? "on " : "off";
    const severity = rule.effectiveSeverity ?? rule.defaultSeverity;
    console.log(`${enabled} ${severity.padEnd(8)} ${rule.id.padEnd(42)} ${rule.title}`);
  }
}


function handlePresets(parsed: ParsedArgs): void {
  const [subcommand, name] = parsed.positional;

  if (!subcommand || subcommand === "list") {
    const presets = listDhalPresets();
    if (parsed.json) {
      console.log(JSON.stringify({ presets }, null, 2));
      return;
    }
    console.log(`Dhal presets: ${presets.length} available`);
    for (const preset of presets) {
      console.log(`${preset.name.padEnd(18)} ${preset.title}`);
      console.log(`  ${preset.description}`);
    }
    return;
  }

  if (subcommand === "show") {
    if (!name) {
      console.error("Usage: dhal presets show <name> [--json]");
      process.exitCode = 1;
      return;
    }
    const preset = getDhalPreset(name);
    if (parsed.json) {
      console.log(JSON.stringify(preset, null, 2));
      return;
    }
    console.log(`${preset.name}: ${preset.title}`);
    console.log(preset.description);
    console.log(`Intended for: ${preset.intendedFor.join(", ")}`);
    for (const note of preset.notes) console.log(`- ${note}`);
    console.log("\nConfig overlay:");
    console.log(JSON.stringify(preset.config, null, 2));
    return;
  }

  if (subcommand === "apply") {
    if (!name) {
      console.error("Usage: dhal presets apply <name> [--config dhal.json] [--output dhal.preset.json] [--write] [--json]");
      process.exitCode = 1;
      return;
    }
    const base = readConfigIfExists(parsed.configPath ?? "dhal.json");
    const config = applyDhalPreset(base, name);
    const serialized = `${JSON.stringify(config, null, 2)}\n`;

    if (parsed.write) {
      const target = resolve(process.cwd(), parsed.outputPath ?? parsed.configPath ?? "dhal.json");
      writeFileSync(target, serialized);
      if (parsed.json) console.log(JSON.stringify({ ok: true, preset: name, wrote: target }, null, 2));
      else console.log(`Applied preset ${name} and wrote ${target}`);
      return;
    }

    if (parsed.outputPath) {
      const target = resolve(process.cwd(), parsed.outputPath);
      if (existsSync(target)) {
        console.error(`Refusing to overwrite existing file: ${target}`);
        process.exitCode = 1;
        return;
      }
      writeFileSync(target, serialized);
      if (parsed.json) console.log(JSON.stringify({ ok: true, preset: name, wrote: target }, null, 2));
      else console.log(`Applied preset ${name} and wrote ${target}`);
      return;
    }

    if (parsed.json) console.log(JSON.stringify({ ok: true, preset: name, config }, null, 2));
    else console.log(serialized);
    return;
  }

  console.error(`Unknown presets subcommand: ${subcommand}`);
  console.error("Usage: dhal presets [list|show|apply] ...");
  process.exitCode = 1;
}

async function autosetup(parsed: ParsedArgs): Promise<void> {
  const projectRoot = parsed.positional[0] ?? ".";
  const provider = (parsed.provider ?? "gateway") as DhalAutosetupProvider;
  const model = parsed.model ?? "openai/gpt-4.1-mini";
  const result = await runDhalAutosetup({
    projectRoot,
    configPath: parsed.configPath ?? "dhal.json",
    provider,
    model,
    write: Boolean(parsed.write),
    useAi: !parsed.noAi,
    maxFiles: parsed.maxFiles ?? 80,
    maxBytesPerFile: parsed.maxBytesPerFile ?? 12_000,
    providerModule: parsed.providerModule,
    providerExport: parsed.providerExport,
    outputPath: parsed.outputPath
  });

  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Dhal autosetup: ${result.usedAi ? "AI-assisted" : "heuristic"} proposal using ${result.provider}/${result.model}`);
  console.log(`Detected frameworks: ${result.scan.frameworkHints.join(", ") || "unknown"}`);
  console.log(`Detected routes: ${result.scan.routes.length}`);
  for (const reason of result.proposal.rationale) console.log(`- ${reason}`);
  for (const warning of result.proposal.warnings) console.log(`WARN ${warning}`);
  if (result.wroteConfig && result.outputPath) console.log(`Wrote ${result.outputPath}`);
  else console.log("No files written. Re-run with --write to apply the proposal.");
}

function testConfig(path = "dhal.json"): void {
  const config = loadDhalConfig(path);
  console.log(JSON.stringify({
    ok: true,
    mode: config.mode,
    rateLimitStore: config.rateLimit.store,
    routeProfiles: Object.keys(config.routes).length,
    identityHeaders: config.identity.headers,
    enabledBehaviorRules: {
      bot: config.rules.bot.enabled,
      honeypot: config.rules.honeypot.enabled,
      credentialStuffing: config.rules.credentialStuffing.enabled
    },
    webhooks: {
      enabled: config.observability.webhooks.enabled,
      targets: config.observability.webhooks.urls.length,
      signing: config.observability.webhooks.signing.enabled
    },
    policy: {
      suppressions: config.policy.suppressions.length,
      sampling: config.policy.sampling.enabled,
      audit: config.policy.audit.enabled
    }
  }, null, 2));
}

function explainConfig(path = "dhal.json"): void {
  const config = loadDhalConfig(path);
  const routeProfiles = Object.entries(config.routes).map(([pattern, profile]) => ({
    pattern,
    mode: profile.mode ?? config.mode,
    tags: profile.tags ?? [],
    rateLimit: profile.rateLimit ?? null,
    rules: profile.rules ?? null,
    ipReputation: profile.ipReputation ?? null
  }));

  console.log(JSON.stringify({
    mode: config.mode,
    trustProxy: config.trustProxy,
    globalRateLimit: config.rateLimit,
    globalRules: config.rules,
    policy: config.policy,
    observability: config.observability,
    routeProfiles
  }, null, 2));
}

async function replay(path?: string, configPath = "dhal.json", json = false, failOnBlock = false): Promise<void> {
  if (!path) {
    console.error("Usage: dhal replay ./false-positive-fixtures.json [--config dhal.json] [--json] [--fail-on-block]");
    process.exitCode = 1;
    return;
  }

  const raw = readFileSync(resolve(process.cwd(), path), "utf8");
  const fixtures = JSON.parse(raw) as ReplayFixture[];
  if (!Array.isArray(fixtures)) throw new Error("Replay file must be a JSON array");

  const engine = createDhal({ configPath, logger: silentLogger });
  const rows: Array<{ index: number; name: string; expected: string; actual: string; passed: boolean; ruleId?: string | undefined }> = [];

  for (const [index, fixture] of fixtures.entries()) {
    const request = "request" in fixture ? fixture.request : fixture;
    const expected = "request" in fixture ? fixture.expected ?? "allow" : fixture.expected ?? fixture.expectedAction ?? "allow";
    const decision = await engine.inspect(request);
    const actual = decision.wouldBlock ? "would-block" : decision.action;
    const passed = failOnBlock ? actual === "allow" : actual === expected;
    rows.push({ index: index + 1, name: fixture.name ?? `${request.method} ${request.path}`, expected, actual, passed, ruleId: decision.ruleId });
  }

  const failed = rows.filter((row) => !row.passed);
  if (json) {
    console.log(JSON.stringify({ ok: failed.length === 0, rows }, null, 2));
  } else {
    console.log(`Dhal replay: ${rows.length - failed.length}/${rows.length} passed`);
    for (const row of rows) {
      console.log(`${row.passed ? "PASS" : "FAIL"} ${String(row.index).padStart(2, "0")} ${row.name} expected=${row.expected} actual=${row.actual} rule=${row.ruleId ?? "none"}`);
    }
  }

  if (failed.length > 0) process.exitCode = 1;
}

async function simulate(path?: string, configPath = "dhal.json", json = false): Promise<void> {
  if (!path) {
    console.error("Usage: dhal simulate ./requests.json [--config dhal.json] [--json]");
    process.exitCode = 1;
    return;
  }

  const resolved = resolve(process.cwd(), path);
  const raw = readFileSync(resolved, "utf8");
  const requests = JSON.parse(raw) as SimulationRequest[];
  if (!Array.isArray(requests)) {
    throw new Error("Simulation file must be a JSON array of DhalRequest objects");
  }

  const engine = createDhal({ configPath, logger: silentLogger });
  const capturedSignals: unknown[] = [];
  engine.events.onSignal((signal) => capturedSignals.push(signal));

  const rows: Array<{ index: number; request: string; ip: string; identity: Record<string, string | undefined>; responseStatus?: number | undefined; decision: DhalDecision }> = [];

  for (const [index, request] of requests.entries()) {
    const identity = extractIdentity(request.headers, engine.config, {
      userId: request.userId,
      tenantId: request.tenantId,
      apiKeyId: request.apiKeyId
    });
    const normalizedRequest = { ...request, ...identity } satisfies SimulationRequest;
    const decision = await engine.inspect(normalizedRequest);

    if (normalizedRequest.responseStatus !== undefined) {
      await engine.recordOutcome(normalizedRequest, { statusCode: normalizedRequest.responseStatus });
    }

    rows.push({
      index: index + 1,
      request: `${normalizedRequest.method} ${normalizedRequest.path}`,
      ip: normalizedRequest.ip,
      identity,
      responseStatus: normalizedRequest.responseStatus,
      decision
    });
  }

  const summary = rows.reduce((acc, row) => {
    if (row.decision.action === "block") acc.blocked += 1;
    else if (row.decision.wouldBlock) acc.wouldBlock += 1;
    else acc.allowed += 1;
    return acc;
  }, { allowed: 0, blocked: 0, wouldBlock: 0, signals: capturedSignals.length });

  if (json) {
    console.log(JSON.stringify({ summary, rows, signals: capturedSignals }, null, 2));
    return;
  }

  console.log(`Dhal simulation: ${summary.allowed} allowed, ${summary.blocked} blocked, ${summary.wouldBlock} would-block, ${summary.signals} signals`);
  for (const row of rows) {
    const outcome = row.decision.wouldBlock ? "would-block" : row.decision.action;
    const response = row.responseStatus === undefined ? "" : ` response=${row.responseStatus}`;
    console.log(
      `${String(row.index).padStart(2, "0")}. ${outcome.padEnd(11)} ${row.request.padEnd(28)} ` +
      `ip=${row.ip.padEnd(15)} rule=${row.decision.ruleId ?? "none"} route=${String(row.decision.meta?.routePattern ?? "default")}${response}`
    );
  }
}

const silentLogger = {
  log() {},
  warn() {},
  error() {}
};

function printHelp(): void {
  console.log(`Dhal CLI

Usage:
  dhal init [path]
  dhal test-config [--config dhal.json]
  dhal explain-config [--config dhal.json]
  dhal schema [outputPath]
  dhal migrate [inputPath] [outputPath]
  dhal ci [--config dhal.json] [--json]
  dhal doctor [--config dhal.json] [--json]
  dhal report [--config dhal.json] [--json] [--output dhal.report.json]
  dhal rules [--config dhal.json] [--json]
  dhal presets [list|show <name>|apply <name>] [--config dhal.json] [--output path] [--write] [--json]
  dhal autosetup [projectRoot] [--provider gateway|openai|anthropic|google|mistral|xai|custom] [--model model-id] [--write] [--json]
  dhal replay ./false-positive-fixtures.json [--config dhal.json] [--json] [--fail-on-block]
  dhal simulate ./requests.json [--config dhal.json] [--json]

Commands:
  init            Create a starter dhal.json
  test-config     Load and validate dhal.json
  explain-config  Print global, route-specific, and behavior controls
  schema          Print JSON schema, or write it to outputPath
  migrate         Print or write a config migrated to the current schema
  ci              Validate config against CI safety policy
  doctor          Run local production-readiness diagnostics
  report          Generate a redacted support report for debugging public installs
  rules           List built-in rule catalog entries and effective enabled/severity state
  presets         List, inspect, or apply production-ready dhal.json config presets
  autosetup       Scan a Node project and propose/apply route-aware Dhal rules; can use the AI SDK package
  replay          Replay expected-allow/block fixtures for false-positive regression testing
  simulate        Run Dhal decisions against request fixtures, including optional responseStatus signals
`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
