#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runDhalAdd, type DhalFramework } from "./add.js";
import { defaultConfig, loadDhalConfig } from "./config.js";
import { evaluateDhalCiPolicy } from "./ci.js";
import { getDhalConfigJsonSchema } from "./config-schema.js";
import { createDhal } from "./engine.js";
import { runDhalAutosetup } from "./autosetup/index.js";
import { runDhalDoctor } from "./doctor.js";
import { runDhalDoctorFix } from "./doctor-fix.js";
import {
  applyDhalFrameworkPreset,
  getDhalFrameworkPreset,
  isFrameworkPresetName,
  listDhalFrameworkPresets
} from "./framework-presets.js";
import { getDhalRuleCatalog } from "./rules/catalog.js";
import { applyDhalPreset, getDhalPreset, listDhalPresets, readConfigIfExists } from "./presets.js";
import { runDhalSupportReport } from "./report.js";
import { getDhalCompatibilityMatrix } from "./compatibility.js";
import { runDhalReadiness } from "./readiness.js";
import { getDhalMigrationPlan, migrateDhalConfig } from "./migrations.js";
import { getDhalApiStabilityReport } from "./stability.js";
import { runDhalReleaseCheck, type DhalReleaseTarget } from "./release-check.js";
import type { DhalAutosetupProvider, DhalRequest } from "./types.js";

const argv = process.argv.slice(2);
const command = argv.shift();
const has = (flag: string) => argv.includes(flag);
const value = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
const positional = () => argv.filter((v, i) => !v.startsWith("--") && (i === 0 || !argv[i - 1]?.startsWith("--")));
const output = (data: unknown) => console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));

async function main(): Promise<void> {
  const pos = positional();
  const configPath = value("--config") ?? positionalConfigPath(command, pos) ?? "dhal.json";
  switch (command) {
    case "init": return init(pos[0] ?? "dhal.json");
    case "add": return finish(runDhalAdd({
      projectRoot: pos[0] ?? value("--root") ?? ".",
      framework: value("--framework") as DhalFramework | undefined,
      configPath: value("--config") ?? "dhal.json",
      integrationPath: value("--integration") ?? "dhal.integration.ts",
      write: has("--write"),
      force: has("--force")
    }));
    case "test-config": return output({ ok: true, ...summary(loadDhalConfig(configPath)) });
    case "explain-config": return output(loadDhalConfig(configPath));
    case "schema": case "export-schema": return writeOrPrint(getDhalConfigJsonSchema(), pos[0]);
    case "migrate": return migrate(pos[0] ?? "dhal.json", pos[1]);
    case "ci": return finish(evaluateDhalCiPolicy(loadDhalConfig(configPath)));
    case "doctor": return finish(has("--fix")
      ? runDhalDoctorFix({
          configPath,
          cwd: value("--root") ?? process.cwd(),
          write: !has("--dry-run"),
          backup: !has("--no-backup")
        })
      : runDhalDoctor({ configPath, cwd: value("--root") ?? process.cwd() }));
    case "report": return report(configPath);
    case "rules": return output({ rules: getDhalRuleCatalog(loadDhalConfig(configPath)) });
    case "compat": case "compatibility": return output(getDhalCompatibilityMatrix());
    case "stability": case "api-stability": return output(getDhalApiStabilityReport());
    case "release-check": return finish(runDhalReleaseCheck({
      rootDir: value("--root") ?? process.cwd(),
      target: (value("--target") ?? "development") as DhalReleaseTarget,
      requireBuild: has("--require-build") ? true : undefined
    }));
    case "readiness": case "v1-readiness": return finish(runDhalReadiness({ configPath, production: has("--production"), minScore: numberValue("--min-score") }));
    case "presets": case "preset": return presets(configPath, pos);
    case "autosetup": return autosetup(pos[0] ?? ".");
    case "simulate": return simulate(pos[0], configPath, false);
    case "replay": return simulate(pos[0], configPath, true);
    case "help": case "--help": case "-h": case undefined: return help();
    default: console.error(`Unknown command: ${command}`); help(); process.exitCode = 1;
  }
}

function init(path: string): void {
  const target = resolve(path);
  if (existsSync(target)) throw new Error(`Refusing to overwrite existing config: ${target}`);
  writeFileSync(target, `${JSON.stringify(defaultConfig, null, 2)}\n`);
  console.log(`Created ${target}`);
}

function migrate(inputPath: string, outputPath?: string): void {
  const target = resolve(inputPath);
  const raw = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) as unknown : {};
  const result = migrateDhalConfig(raw);
  if (has("--check")) return finish({ ...result, config: undefined, plan: getDhalMigrationPlan() });
  if (has("--write") || outputPath) {
    const out = resolve(outputPath ?? inputPath);
    writeFileSync(out, `${JSON.stringify(result.config, null, 2)}\n`);
    return output({ ok: result.ok, wrote: out, changed: result.changed, notices: result.notices });
  }
  output(result);
}

function report(configPath: string): void {
  const result = runDhalSupportReport({ configPath });
  const out = value("--output");
  if (out) {
    writeFileSync(resolve(out), `${JSON.stringify(result, null, 2)}\n`);
    return output({ ok: true, wrote: resolve(out) });
  }
  output(result);
}

function presets(configPath: string, pos: string[]): void {
  const sub = pos[0] ?? "list";
  if (sub === "list") {
    return output({ presets: [...listDhalPresets(), ...listDhalFrameworkPresets()] });
  }

  const name = pos[1];
  if (!name) throw new Error("Preset name is required");
  if (sub === "show") {
    return output(isFrameworkPresetName(name) ? getDhalFrameworkPreset(name) : getDhalPreset(name));
  }
  if (sub !== "apply") throw new Error(`Unknown preset command: ${sub}`);

  const current = readConfigIfExists(configPath);
  const config = isFrameworkPresetName(name)
    ? applyDhalFrameworkPreset(current, name)
    : applyDhalPreset(current, name);
  const out = value("--output") ?? (has("--write") ? configPath : undefined);
  if (out) {
    writeFileSync(resolve(out), `${JSON.stringify(config, null, 2)}\n`);
    return output({ ok: true, preset: name, wrote: resolve(out) });
  }
  output(config);
}

async function autosetup(root: string): Promise<void> {
  const result = await runDhalAutosetup({
    projectRoot: root,
    configPath: value("--config") ?? "dhal.json",
    provider: (value("--provider") ?? "gateway") as DhalAutosetupProvider,
    model: value("--model") ?? "openai/gpt-4.1-mini",
    write: has("--write"),
    useAi: !has("--no-ai"),
    maxFiles: numberValue("--max-files") ?? 80,
    maxBytesPerFile: numberValue("--max-bytes-per-file") ?? 12_000,
    providerModule: value("--provider-module"),
    providerExport: value("--provider-export"),
    outputPath: value("--output")
  });
  output(result);
}

async function simulate(path: string | undefined, configPath: string, replay: boolean): Promise<void> {
  if (!path) throw new Error(`Usage: dhal ${replay ? "replay" : "simulate"} <fixtures.json>`);
  const fixtures = JSON.parse(readFileSync(resolve(path), "utf8")) as Array<DhalRequest & { expected?: string; responseStatus?: number }>;
  if (!Array.isArray(fixtures)) throw new Error("Fixture file must be a JSON array");
  const engine = createDhal({ configPath, logger: { log() {}, warn() {}, error() {} } });
  const rows = [];
  for (const [index, request] of fixtures.entries()) {
    const decision = await engine.inspect(request);
    if (request.responseStatus !== undefined) await engine.recordOutcome(request, { statusCode: request.responseStatus });
    const actual = decision.wouldBlock ? "would-block" : decision.action;
    rows.push({ index: index + 1, expected: request.expected, actual, passed: !replay || request.expected === actual, ruleId: decision.ruleId });
  }
  const ok = rows.every((row) => row.passed);
  output({ ok, rows });
  if (!ok) process.exitCode = 1;
}

function writeOrPrint(data: unknown, path?: string): void {
  if (!path) return output(data);
  writeFileSync(resolve(path), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Created ${resolve(path)}`);
}

function finish(result: { ok?: boolean } & Record<string, unknown>): void {
  output(result);
  if (result.ok === false) process.exitCode = 1;
}

function summary(config: ReturnType<typeof loadDhalConfig>) {
  return { schemaVersion: config.schemaVersion, mode: config.mode, trustProxy: config.trustProxy, routeProfiles: Object.keys(config.routes).length, rateLimitStore: config.rateLimit.store };
}

function numberValue(flag: string): number | undefined {
  const raw = value(flag);
  return raw === undefined ? undefined : Number(raw);
}

function positionalConfigPath(currentCommand: string | undefined, pos: string[]): string | undefined {
  switch (currentCommand) {
    case "test-config":
    case "explain-config":
    case "ci":
    case "doctor":
    case "report":
    case "rules":
    case "readiness":
    case "v1-readiness":
    case "simulate":
    case "replay":
      return pos[0];
    default:
      return undefined;
  }
}

function help(): void {
  console.log(`Dhal CLI\n\nCommands: init, add, test-config, explain-config, schema, migrate, ci, doctor, report, rules, readiness, compat, stability, release-check, presets, autosetup, replay, simulate\n\nOnboarding: dhal add [project] [--framework express|fastify|nestjs|koa|hono|node-http] [--write] [--force]\nRepair: dhal doctor --fix [--dry-run] [--no-backup]\nRelease gate: dhal release-check --target development|rc|stable [--require-build]\n\nUse --json for machine-readable output.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
