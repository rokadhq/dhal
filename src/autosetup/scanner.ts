import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type ProjectScanFile = {
  path: string;
  bytes: number;
  language: string;
  snippet: string;
  findings: string[];
};

export type ProjectScan = {
  root: string;
  frameworkHints: string[];
  packageHints: string[];
  files: ProjectScanFile[];
  routes: Array<{
    method: string;
    path: string;
    source: string;
    risk: string[];
  }>;
};

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", ".turbo", ".cache", "vendor"]);
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"]);
const MAX_TOTAL_FILES = 400;

export function scanProject(root: string, options: { maxFiles: number; maxBytesPerFile: number }): ProjectScan {
  const files: ProjectScanFile[] = [];
  const packageHints = readPackageHints(root);
  const frameworkHints = inferFrameworkHints(root, packageHints);

  for (const path of walk(root)) {
    if (files.length >= Math.min(options.maxFiles, MAX_TOTAL_FILES)) break;
    const bytes = statSync(path).size;
    if (bytes > 512_000) continue;

    const rel = relative(root, path).replaceAll("\\", "/");
    const raw = readFileSync(path, "utf8");
    const snippet = raw.slice(0, options.maxBytesPerFile);
    const language = inferLanguage(rel);
    const findings = inferFileFindings(rel, raw);
    if (findings.length === 0 && !isLikelyRouteFile(rel, raw)) continue;

    files.push({ path: rel, bytes, language, snippet, findings });
  }

  return {
    root,
    frameworkHints,
    packageHints,
    files,
    routes: inferRoutes(files)
  };
}

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      yield* walk(full);
    } else if (stat.isFile() && ALLOWED_EXTENSIONS.has(extensionOf(entry))) {
      yield full;
    }
  }
}

function readPackageHints(root: string): string[] {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    return Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }).sort();
  } catch {
    return [];
  }
}

function inferFrameworkHints(root: string, packages: string[]): string[] {
  const hints = new Set<string>();
  const deps = new Set(packages);
  if (deps.has("express")) hints.add("express");
  if (deps.has("fastify")) hints.add("fastify");
  if (deps.has("next")) hints.add("next");
  if (deps.has("@nestjs/core")) hints.add("nestjs");
  if (deps.has("hono")) hints.add("hono");
  if (deps.has("koa")) hints.add("koa");

  try {
    if (statSync(join(root, "app")).isDirectory()) hints.add("next-app-router");
  } catch {}

  return [...hints].sort();
}

function inferFileFindings(path: string, source: string): string[] {
  const findings = new Set<string>();
  const lower = `${path}\n${source}`.toLowerCase();

  if (/login|signin|password|credential|jwt|session/.test(lower)) findings.add("auth");
  if (/upload|multer|formidable|multipart|s3|blob/.test(lower)) findings.add("upload");
  if (/stripe|razorpay|payment|checkout|webhook/.test(lower)) findings.add("payments-or-webhooks");
  if (/admin|dashboard|internal/.test(lower)) findings.add("admin");
  if (/graphql|apollo|__schema/.test(lower)) findings.add("graphql");
  if (/proxy|fetch\(|axios\.|request\(|url\(|redirect/.test(lower)) findings.add("outbound-url-or-proxy");
  if (/express|fastify|hono|koa|router\./.test(lower)) findings.add("server-routes");
  if (/rate|throttle|helmet|cors|csrf/.test(lower)) findings.add("existing-security-middleware");

  return [...findings].sort();
}

function inferRoutes(files: ProjectScanFile[]): ProjectScan["routes"] {
  const routes: ProjectScan["routes"] = [];

  for (const file of files) {
    const source = file.snippet;
    const regexes = [
      /(?:app|router)\.(get|post|put|patch|delete|all|use)\(\s*["'`]([^"'`]+)["'`]/gi,
      /fastify\.(get|post|put|patch|delete|all)\(\s*["'`]([^"'`]+)["'`]/gi,
      /new\s+Route\(\s*["'`]([^"'`]+)["'`]/gi
    ];

    for (const regex of regexes) {
      for (const match of source.matchAll(regex)) {
        const method = match.length === 3 ? String(match[1]).toUpperCase() : "ALL";
        const path = match.length === 3 ? String(match[2]) : String(match[1]);
        if (path.startsWith("/")) routes.push({ method, path, source: file.path, risk: riskForPath(path, file.findings) });
      }
    }

    const nextRoute = inferNextRoute(file.path);
    if (nextRoute) routes.push({ method: "ALL", path: nextRoute, source: file.path, risk: riskForPath(nextRoute, file.findings) });
  }

  return dedupeRoutes(routes);
}

function inferNextRoute(path: string): string | undefined {
  if (!/(^|\/)route\.(ts|js)$/.test(path)) return undefined;
  const appIndex = path.indexOf("app/");
  const pagesIndex = path.indexOf("pages/api/");
  if (appIndex >= 0) {
    const route = path.slice(appIndex + 4).replace(/\/route\.(ts|js)$/, "").replace(/\([^)]*\)\//g, "").replace(/\[\.\.\.([^\]]+)\]/g, "*$1").replace(/\[([^\]]+)\]/g, ":$1");
    return `/${route}`.replace(/\/+/g, "/");
  }
  if (pagesIndex >= 0) {
    const route = path.slice(pagesIndex + "pages/api/".length).replace(/\.(ts|js)$/, "").replace(/\[\.\.\.([^\]]+)\]/g, "*$1").replace(/\[([^\]]+)\]/g, ":$1");
    return `/api/${route}`.replace(/\/+/g, "/");
  }
  return undefined;
}

function riskForPath(path: string, existing: string[]): string[] {
  const risks = new Set(existing);
  const lower = path.toLowerCase();
  if (/login|signin|auth|token|password/.test(lower)) risks.add("auth");
  if (/upload|import|file/.test(lower)) risks.add("upload");
  if (/admin|internal/.test(lower)) risks.add("admin");
  if (/webhook|payment|checkout|stripe|razorpay/.test(lower)) risks.add("payments-or-webhooks");
  if (/graphql/.test(lower)) risks.add("graphql");
  return [...risks].sort();
}

function dedupeRoutes(routes: ProjectScan["routes"]): ProjectScan["routes"] {
  const map = new Map<string, ProjectScan["routes"][number]>();
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    if (!map.has(key)) map.set(key, route);
  }
  return [...map.values()].slice(0, 100);
}

function isLikelyRouteFile(path: string, source: string): boolean {
  return /route\.(ts|js)$/.test(path) || /(?:app|router|fastify)\.(?:get|post|put|patch|delete|all|use)\(/.test(source);
}

function inferLanguage(path: string): string {
  const ext = extensionOf(path);
  if (ext === ".tsx" || ext === ".jsx") return "tsx/jsx";
  if (ext === ".ts") return "typescript";
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return "javascript";
  if (ext === ".json") return "json";
  return "text";
}

function extensionOf(path: string): string {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}
