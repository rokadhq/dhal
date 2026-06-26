#!/usr/bin/env node
import {
  runDhalSupportReport
} from "./chunk-APJ5JOI4.js";
import {
  getDhalApiStabilityReport
} from "./chunk-6ODIBQ3U.js";
import {
  createDhal
} from "./chunk-MANVZKED.js";
import "./chunk-IRZXZAQ4.js";
import "./chunk-JCY2QFLP.js";
import "./chunk-BGMTMZGL.js";
import {
  runDhalAutosetup
} from "./chunk-CKDCBSDL.js";
import "./chunk-X7PS5EQX.js";
import {
  getDhalConfigJsonSchema
} from "./chunk-VAJ4H2RV.js";
import {
  getDhalMigrationPlan,
  migrateDhalConfig
} from "./chunk-ZGVV7H2U.js";
import {
  applyDhalPreset,
  getDhalPreset,
  listDhalPresets,
  readConfigIfExists
} from "./chunk-BULVRAC5.js";
import {
  runDhalReadiness
} from "./chunk-HBRYRBZJ.js";
import {
  getDhalCompatibilityMatrix
} from "./chunk-Q76R3BJI.js";
import {
  evaluateDhalCiPolicy,
  runDhalDoctor
} from "./chunk-SPEVWJOA.js";
import {
  getDhalRuleCatalog
} from "./chunk-INPUNSI6.js";
import {
  defaultConfig,
  loadDhalConfig
} from "./chunk-I43VAMHW.js";

// src/cli.ts
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
var argv = process.argv.slice(2);
var command = argv.shift();
var has = (flag) => argv.includes(flag);
var value = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : void 0;
};
var positional = () => argv.filter((v, i) => !v.startsWith("--") && (i === 0 || !argv[i - 1]?.startsWith("--")));
var output = (data) => console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
async function main() {
  const pos = positional();
  const configPath = value("--config") ?? pos[0] ?? "dhal.json";
  switch (command) {
    case "init":
      return init(pos[0] ?? "dhal.json");
    case "test-config":
      return output({ ok: true, ...summary(loadDhalConfig(configPath)) });
    case "explain-config":
      return output(loadDhalConfig(configPath));
    case "schema":
    case "export-schema":
      return writeOrPrint(getDhalConfigJsonSchema(), pos[0]);
    case "migrate":
      return migrate(pos[0] ?? "dhal.json", pos[1]);
    case "ci":
      return finish(evaluateDhalCiPolicy(loadDhalConfig(configPath)));
    case "doctor":
      return finish(runDhalDoctor({ configPath }));
    case "report":
      return report(configPath);
    case "rules":
      return output({ rules: getDhalRuleCatalog(loadDhalConfig(configPath)) });
    case "compat":
    case "compatibility":
      return output(getDhalCompatibilityMatrix());
    case "stability":
    case "api-stability":
      return output(getDhalApiStabilityReport());
    case "readiness":
    case "v1-readiness":
      return finish(runDhalReadiness({ configPath, production: has("--production"), minScore: numberValue("--min-score") }));
    case "presets":
    case "preset":
      return presets(configPath, pos);
    case "autosetup":
      return autosetup(pos[0] ?? ".");
    case "simulate":
      return simulate(pos[0], configPath, false);
    case "replay":
      return simulate(pos[0], configPath, true);
    case "help":
    case "--help":
    case "-h":
    case void 0:
      return help();
    default:
      console.error(`Unknown command: ${command}`);
      help();
      process.exitCode = 1;
  }
}
function init(path) {
  const target = resolve(path);
  if (existsSync(target)) throw new Error(`Refusing to overwrite existing config: ${target}`);
  writeFileSync(target, `${JSON.stringify(defaultConfig, null, 2)}
`);
  console.log(`Created ${target}`);
}
function migrate(inputPath, outputPath) {
  const target = resolve(inputPath);
  const raw = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : {};
  const result = migrateDhalConfig(raw);
  if (has("--check")) return finish({ ...result, config: void 0, plan: getDhalMigrationPlan() });
  if (has("--write") || outputPath) {
    const out = resolve(outputPath ?? inputPath);
    writeFileSync(out, `${JSON.stringify(result.config, null, 2)}
`);
    return output({ ok: result.ok, wrote: out, changed: result.changed, notices: result.notices });
  }
  output(result);
}
function report(configPath) {
  const result = runDhalSupportReport({ configPath });
  const out = value("--output");
  if (out) {
    writeFileSync(resolve(out), `${JSON.stringify(result, null, 2)}
`);
    return output({ ok: true, wrote: resolve(out) });
  }
  output(result);
}
function presets(configPath, pos) {
  const sub = pos[0] ?? "list";
  if (sub === "list") return output({ presets: listDhalPresets() });
  const name = pos[1];
  if (!name) throw new Error("Preset name is required");
  if (sub === "show") return output(getDhalPreset(name));
  if (sub !== "apply") throw new Error(`Unknown preset command: ${sub}`);
  const config = applyDhalPreset(readConfigIfExists(configPath), name);
  const out = value("--output") ?? (has("--write") ? configPath : void 0);
  if (out) {
    writeFileSync(resolve(out), `${JSON.stringify(config, null, 2)}
`);
    return output({ ok: true, preset: name, wrote: resolve(out) });
  }
  output(config);
}
async function autosetup(root) {
  const result = await runDhalAutosetup({
    projectRoot: root,
    configPath: value("--config") ?? "dhal.json",
    provider: value("--provider") ?? "gateway",
    model: value("--model") ?? "openai/gpt-4.1-mini",
    write: has("--write"),
    useAi: !has("--no-ai"),
    maxFiles: numberValue("--max-files") ?? 80,
    maxBytesPerFile: numberValue("--max-bytes-per-file") ?? 12e3,
    providerModule: value("--provider-module"),
    providerExport: value("--provider-export"),
    outputPath: value("--output")
  });
  output(result);
}
async function simulate(path, configPath, replay) {
  if (!path) throw new Error(`Usage: dhal ${replay ? "replay" : "simulate"} <fixtures.json>`);
  const fixtures = JSON.parse(readFileSync(resolve(path), "utf8"));
  if (!Array.isArray(fixtures)) throw new Error("Fixture file must be a JSON array");
  const engine = createDhal({ configPath, logger: { log() {
  }, warn() {
  }, error() {
  } } });
  const rows = [];
  for (const [index, request] of fixtures.entries()) {
    const decision = await engine.inspect(request);
    if (request.responseStatus !== void 0) await engine.recordOutcome(request, { statusCode: request.responseStatus });
    const actual = decision.wouldBlock ? "would-block" : decision.action;
    rows.push({ index: index + 1, expected: request.expected, actual, passed: !replay || request.expected === actual, ruleId: decision.ruleId });
  }
  const ok = rows.every((row) => row.passed);
  output({ ok, rows });
  if (!ok) process.exitCode = 1;
}
function writeOrPrint(data, path) {
  if (!path) return output(data);
  writeFileSync(resolve(path), `${JSON.stringify(data, null, 2)}
`);
  console.log(`Created ${resolve(path)}`);
}
function finish(result) {
  output(result);
  if (result.ok === false) process.exitCode = 1;
}
function summary(config) {
  return { schemaVersion: config.schemaVersion, mode: config.mode, trustProxy: config.trustProxy, routeProfiles: Object.keys(config.routes).length, rateLimitStore: config.rateLimit.store };
}
function numberValue(flag) {
  const raw = value(flag);
  return raw === void 0 ? void 0 : Number(raw);
}
function help() {
  console.log(`Dhal CLI

Commands: init, test-config, explain-config, schema, migrate, ci, doctor, report, rules, readiness, compat, stability, presets, autosetup, replay, simulate

Use --json for machine-readable output.`);
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
