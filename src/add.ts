import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { applyDhalPreset } from "./presets.js";

export type DhalFramework = "express" | "fastify" | "nestjs" | "koa" | "hono" | "node-http" | "unknown";
export type DhalPackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";

export type DhalAddOptions = {
  projectRoot?: string | undefined;
  framework?: DhalFramework | undefined;
  configPath?: string | undefined;
  integrationPath?: string | undefined;
  write?: boolean | undefined;
  force?: boolean | undefined;
};

export type DhalAddFilePlan = {
  kind: "config" | "integration";
  path: string;
  exists: boolean;
  action: "create" | "overwrite" | "skip" | "preview";
  content: string;
};

export type DhalAddResult = {
  ok: boolean;
  packageName: "@rokadhq/dhal";
  projectRoot: string;
  framework: DhalFramework;
  frameworkSource: "detected" | "explicit" | "unknown";
  packageManager: DhalPackageManager;
  packageInstalled: boolean;
  installCommand: string;
  writeRequested: boolean;
  files: DhalAddFilePlan[];
  wrote: string[];
  warnings: string[];
  instructions: string[];
};

type PackageJson = {
  dependencies?: Record<string, string> | undefined;
  devDependencies?: Record<string, string> | undefined;
};

export function runDhalAdd(options: DhalAddOptions = {}): DhalAddResult {
  const projectRoot = resolve(options.projectRoot ?? ".");
  const packageJson = readPackageJson(projectRoot);
  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {})
  };
  const detectedFramework = detectFramework(dependencies);
  const framework = options.framework ?? detectedFramework;
  const packageManager = detectPackageManager(projectRoot);
  const configRelativePath = options.configPath ?? "dhal.json";
  const integrationRelativePath = options.integrationPath ?? "dhal.integration.ts";
  const configPath = resolve(projectRoot, configRelativePath);
  const integrationPath = resolve(projectRoot, integrationRelativePath);
  const writeRequested = options.write === true;
  const force = options.force === true;
  const packageInstalled = Object.prototype.hasOwnProperty.call(dependencies, "@rokadhq/dhal");
  const warnings: string[] = [];
  const wrote: string[] = [];

  if (!packageJson) warnings.push("No package.json was found in the project root.");
  if (framework === "unknown") warnings.push("No supported framework was detected. Pass --framework explicitly.");
  if (!packageInstalled) warnings.push("@rokadhq/dhal is not listed in package.json yet.");

  const preset = frameworkPreset(framework);
  const config = applyDhalPreset({}, preset);
  config.mode = "monitor";
  const configContent = `${JSON.stringify(config, null, 2)}\n`;
  const integrationContent = renderIntegration(framework, configRelativePath);

  const files: DhalAddFilePlan[] = [
    planFile("config", configPath, configContent, writeRequested, force),
    planFile("integration", integrationPath, integrationContent, writeRequested, force, framework === "unknown")
  ];

  if (writeRequested) {
    for (const file of files) {
      if (file.action !== "create" && file.action !== "overwrite") continue;
      mkdirSync(dirname(file.path), { recursive: true });
      writeFileSync(file.path, file.content);
      wrote.push(file.path);
    }
  }

  for (const file of files) {
    if (file.action === "skip") warnings.push(`Skipped existing ${file.kind} file: ${file.path}`);
  }

  const instructions = buildInstructions({
    framework,
    packageInstalled,
    installCommand: installCommand(packageManager),
    configRelativePath,
    integrationRelativePath,
    writeRequested
  });

  return {
    ok: framework !== "unknown",
    packageName: "@rokadhq/dhal",
    projectRoot,
    framework,
    frameworkSource: options.framework ? "explicit" : framework === "unknown" ? "unknown" : "detected",
    packageManager,
    packageInstalled,
    installCommand: installCommand(packageManager),
    writeRequested,
    files,
    wrote,
    warnings,
    instructions
  };
}

export function detectFramework(dependencies: Record<string, string>): DhalFramework {
  if (dependencies["@nestjs/core"]) return "nestjs";
  if (dependencies.hono) return "hono";
  if (dependencies.koa) return "koa";
  if (dependencies.fastify) return "fastify";
  if (dependencies.express) return "express";
  return "unknown";
}

export function detectPackageManager(projectRoot: string): DhalPackageManager {
  if (existsSync(resolve(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(resolve(projectRoot, "yarn.lock"))) return "yarn";
  if (existsSync(resolve(projectRoot, "bun.lock")) || existsSync(resolve(projectRoot, "bun.lockb"))) return "bun";
  if (existsSync(resolve(projectRoot, "package-lock.json"))) return "npm";
  return "unknown";
}

function readPackageJson(projectRoot: string): PackageJson | undefined {
  const path = resolve(projectRoot, "package.json");
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
  } catch (error) {
    throw new Error(`Could not parse ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function frameworkPreset(framework: DhalFramework): string {
  switch (framework) {
    case "nestjs": return "nestjs-api";
    case "koa": return "koa-api";
    case "hono": return "hono-node-api";
    case "express": return "express-api";
    case "fastify": return "fastify-api";
    case "node-http": return "node-http-api";
    default: return "starter";
  }
}

function planFile(
  kind: DhalAddFilePlan["kind"],
  path: string,
  content: string,
  writeRequested: boolean,
  force: boolean,
  unsupported = false
): DhalAddFilePlan {
  const exists = existsSync(path);
  let action: DhalAddFilePlan["action"];

  if (unsupported) action = "skip";
  else if (!writeRequested) action = "preview";
  else if (!exists) action = "create";
  else if (force) action = "overwrite";
  else action = "skip";

  return { kind, path, exists, action, content };
}

function installCommand(packageManager: DhalPackageManager): string {
  switch (packageManager) {
    case "pnpm": return "pnpm add @rokadhq/dhal";
    case "yarn": return "yarn add @rokadhq/dhal";
    case "bun": return "bun add @rokadhq/dhal";
    default: return "npm install @rokadhq/dhal";
  }
}

function renderIntegration(framework: DhalFramework, configPath: string): string {
  switch (framework) {
    case "express":
      return `import { dhal } from "@rokadhq/dhal/express";\n\nexport const dhalMiddleware = dhal({ configPath: ${JSON.stringify(configPath)} });\n`;
    case "fastify":
      return `import { dhalFastify } from "@rokadhq/dhal/fastify";\n\nexport const dhalPlugin = dhalFastify({ configPath: ${JSON.stringify(configPath)} });\n`;
    case "nestjs":
      return `import type { INestApplication } from "@nestjs/common";\nimport { installDhalNest } from "@rokadhq/dhal";\n\nexport function installDhal(application: INestApplication) {\n  return installDhalNest(application, { configPath: ${JSON.stringify(configPath)} });\n}\n`;
    case "koa":
      return `import { dhalKoa } from "@rokadhq/dhal";\n\nexport const dhalMiddleware = dhalKoa({ configPath: ${JSON.stringify(configPath)} });\n`;
    case "hono":
      return `import { dhalHono } from "@rokadhq/dhal";\n\nexport const dhalMiddleware = dhalHono({ configPath: ${JSON.stringify(configPath)} });\n`;
    case "node-http":
      return `import { createNodeHttpDhal } from "@rokadhq/dhal/node-http";\n\nexport const dhalProtection = createNodeHttpDhal({ configPath: ${JSON.stringify(configPath)} });\n`;
    default:
      return "// No supported framework was detected. Re-run dhal add with --framework.\n";
  }
}

function buildInstructions(input: {
  framework: DhalFramework;
  packageInstalled: boolean;
  installCommand: string;
  configRelativePath: string;
  integrationRelativePath: string;
  writeRequested: boolean;
}): string[] {
  const instructions: string[] = [];
  if (!input.packageInstalled) instructions.push(`Install Dhal: ${input.installCommand}`);
  if (!input.writeRequested) instructions.push("Review the generated file previews, then re-run with --write.");
  instructions.push(`Review ${input.configRelativePath}; it is intentionally generated in monitor mode.`);

  switch (input.framework) {
    case "express": instructions.push(`Import dhalMiddleware from ${input.integrationRelativePath} and register it with app.use() before routes.`); break;
    case "fastify": instructions.push(`Import dhalPlugin from ${input.integrationRelativePath} and register it before routes.`); break;
    case "nestjs": instructions.push(`Call installDhal(app) from ${input.integrationRelativePath} before app.listen().`); break;
    case "koa": instructions.push(`Import dhalMiddleware from ${input.integrationRelativePath} and register it with app.use() before routes.`); break;
    case "hono": instructions.push(`Import dhalMiddleware from ${input.integrationRelativePath} and register it with app.use("*", ...) before routes.`); break;
    case "node-http": instructions.push(`Use dhalProtection from ${input.integrationRelativePath} at the start of the request handler.`); break;
    default: instructions.push("Choose one of: express, fastify, nestjs, koa, hono, node-http.");
  }

  instructions.push("Run dhal doctor and dhal test-config before deployment.");
  return instructions;
}
