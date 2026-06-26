import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const temp = await mkdtemp(resolve(tmpdir(), "dhal-package-consumer-"));
let tarball;

try {
  const pack = JSON.parse(run(npm, ["pack", "--json", "--ignore-scripts"], root));
  if (!Array.isArray(pack) || typeof pack[0]?.filename !== "string") {
    throw new Error("npm pack did not return a tarball filename");
  }

  tarball = resolve(root, pack[0].filename);
  await writeFile(resolve(temp, "package.json"), JSON.stringify({ name: "dhal-v1-consumer", private: true, type: "module" }, null, 2));
  run(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--omit=optional", tarball], temp);

  for (const dependency of [
    "express",
    "fastify",
    "ioredis",
    "@opentelemetry/api",
    "@types/node",
    "@types/express"
  ]) {
    await linkDependency(dependency);
  }

  const contractModule = await import(pathToFileURL(resolve(root, "dist/v1-contract.js")).href);
  const stablePaths = contractModule.DHAL_V1_PUBLIC_EXPORTS
    .filter((entry) => entry.stability === "stable")
    .map((entry) => entry.path);

  await writeFile(resolve(temp, "verify-esm.mjs"), esmConsumer());
  await writeFile(resolve(temp, "verify-cjs.cjs"), cjsConsumer());
  run(process.execPath, ["verify-esm.mjs"], temp);
  run(process.execPath, ["verify-cjs.cjs"], temp);

  const typeSpecifiers = stablePaths
    .filter((entry) => entry !== "./package.json" && entry !== "./dhal.schema.json")
    .map(toSpecifier);
  await writeFile(resolve(temp, "consumer.ts"), typeSpecifiers.map((specifier, index) =>
    `import * as module${index} from ${JSON.stringify(specifier)};\nvoid module${index};`
  ).join("\n"));
  await writeFile(resolve(temp, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: ["node"]
    },
    include: ["consumer.ts"]
  }, null, 2));

  const tsc = resolve(root, "node_modules", "typescript", "bin", "tsc");
  run(process.execPath, [tsc, "--project", "tsconfig.json"], temp);

  console.log(`Dhal packed package: ${stablePaths.length} stable exports verified in ESM, CommonJS, and TypeScript`);
} finally {
  await rm(temp, { recursive: true, force: true });
  if (tarball) await rm(tarball, { force: true });
}

function esmConsumer() {
  return `import { createRequire } from "node:module";\n` +
    `const require = createRequire(import.meta.url);\n` +
    `const { DHAL_V1_PUBLIC_EXPORTS } = await import("@rokadhq/dhal/v1-contract");\n` +
    `for (const entry of DHAL_V1_PUBLIC_EXPORTS.filter((item) => item.stability === "stable")) {\n` +
    `  const specifier = entry.path === "." ? "@rokadhq/dhal" : "@rokadhq/dhal" + entry.path.slice(1);\n` +
    `  if (entry.path.endsWith(".json")) require(specifier); else await import(specifier);\n` +
    `}\n`;
}

function cjsConsumer() {
  return `const { DHAL_V1_PUBLIC_EXPORTS } = require("@rokadhq/dhal/v1-contract");\n` +
    `for (const entry of DHAL_V1_PUBLIC_EXPORTS.filter((item) => item.stability === "stable")) {\n` +
    `  const specifier = entry.path === "." ? "@rokadhq/dhal" : "@rokadhq/dhal" + entry.path.slice(1);\n` +
    `  require(specifier);\n` +
    `}\n`;
}

function toSpecifier(path) {
  return path === "." ? "@rokadhq/dhal" : `@rokadhq/dhal${path.slice(1)}`;
}

async function linkDependency(name) {
  const source = resolve(root, "node_modules", name);
  if (!existsSync(source)) throw new Error(`Required consumer-test dependency is missing: ${name}`);
  const target = resolve(temp, "node_modules", name);
  await mkdir(dirname(target), { recursive: true });
  await rm(target, { recursive: true, force: true });
  await symlink(source, target, process.platform === "win32" ? "junction" : "dir");
}

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, npm_config_update_notifier: "false" }
  }).trim();
}
