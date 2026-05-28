import {
  deepMerge,
  defaultConfig,
  loadDhalConfig
} from "./chunk-JUWTNUCA.js";

// src/autosetup/index.ts
import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";

// src/autosetup/heuristics.ts
function buildHeuristicProposal(scan) {
  const routes = {};
  const rationale = [];
  const warnings = [];
  const packs = /* @__PURE__ */ new Set(["generic-web", "api"]);
  if (scan.frameworkHints.length === 0) {
    warnings.push("No supported Node web framework was confidently detected; generated config is conservative.");
  }
  if (scan.routes.some((route) => route.risk.includes("auth"))) {
    packs.add("auth");
    rationale.push("Detected auth/login routes; enabling auth rule pack and credential-stuffing profiles.");
  }
  if (scan.routes.some((route) => route.risk.includes("graphql"))) {
    rationale.push("Detected GraphQL-like routes; API rule pack will include GraphQL introspection probes.");
  }
  for (const route of scan.routes) {
    const path = normalizeRoutePattern(route.path);
    const risk = new Set(route.risk);
    if (risk.has("auth")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "block",
        tags: ["autosetup", "auth"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 8, keyBy: ["ip", "route"] },
        rules: {
          credentialStuffing: {
            enabled: true,
            loginPathPatterns: [path],
            windowSeconds: 300,
            maxFailures: 6,
            keyBy: ["ip", "route", "userAgent"]
          },
          bot: { enabled: true, scoreThreshold: 65 }
        }
      });
      rationale.push(`Added strict auth protection for ${path}.`);
    }
    if (risk.has("admin")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "block",
        tags: ["autosetup", "admin"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 30, keyBy: ["ip", "route"] },
        rules: { bot: { enabled: true, scoreThreshold: 60 } }
      });
      rationale.push(`Added lower bot threshold and tighter rate limits for admin route ${path}.`);
    }
    if (risk.has("upload")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "block",
        tags: ["autosetup", "upload"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 20, keyBy: ["ip", "route"] },
        rules: {
          largePayload: { enabled: true, maxBytes: 5 * 1024 * 1024 },
          api: { enabled: false }
        }
      });
      rationale.push(`Added upload-specific payload and rate-limit controls for ${path}.`);
    }
    if (risk.has("payments-or-webhooks")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "block",
        tags: ["autosetup", "webhook-or-payment"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 120, keyBy: ["ip", "route"] },
        rules: {
          contentType: { enabled: true, blockJsonMismatch: true },
          bot: { enabled: true, scoreThreshold: 80 }
        }
      });
      warnings.push(`Route ${path} looks like a webhook/payment route; Dhal can rate-limit and inspect it, but provider signature verification must stay in application code.`);
    }
    if (risk.has("graphql")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "monitor",
        tags: ["autosetup", "graphql"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 60, keyBy: ["ip", "route"] },
        rules: {
          api: { enabled: true, maxJsonDepth: 12, maxJsonKeys: 250 }
        }
      });
      rationale.push(`Added GraphQL-oriented JSON depth/key limits for ${path}.`);
    }
  }
  const proposal = {
    mode: "monitor",
    trustProxy: inferTrustProxy(scan),
    rules: {
      packs: [...packs],
      api: {
        enabled: scan.frameworkHints.includes("next") || scan.routes.some((route) => route.path.startsWith("/api")),
        requireJsonContentType: true,
        allowedContentTypes: ["application/json", "application/problem+json"],
        methodsWithBody: ["POST", "PUT", "PATCH"],
        maxJsonDepth: 20,
        maxJsonKeys: 500
      },
      headers: {
        enabled: true,
        requireHostHeader: true,
        maxHeaderCount: 96,
        maxHeaderBytes: 16384,
        suspiciousHeaders: ["x-original-url", "x-rewrite-url", "x-forwarded-host"],
        blockConflictingForwardingHeaders: false
      },
      contentType: {
        enabled: true,
        blockMissingOnBodyMethods: false,
        blockJsonMismatch: true,
        allowedJsonMimeTypes: ["application/json", "application/problem+json", "application/ld+json"]
      },
      credentialStuffing: {
        enabled: scan.routes.some((route) => route.risk.includes("auth")),
        loginPathPatterns: scan.routes.filter((route) => route.risk.includes("auth")).map((route) => normalizeRoutePattern(route.path)).slice(0, 20)
      }
    },
    routes,
    policy: {
      audit: { enabled: true, includeSuppressed: true }
    }
  };
  if (Object.keys(routes).length === 0) {
    rationale.push("No explicit route profile was needed; global monitor-mode controls remain enabled.");
  }
  return {
    config: deepMerge(defaultConfig, proposal),
    rationale,
    warnings
  };
}
function inferTrustProxy(scan) {
  return scan.packageHints.some((name) => ["next", "@vercel/node", "serverless-http"].includes(name));
}
function normalizeRoutePattern(path) {
  return path.replace(/:([^/]+)/g, "*").replace(/\*[^/]*/g, "*");
}
function mergeRouteProfile(current, patch) {
  return deepMerge(current ?? {}, patch);
}

// src/autosetup/ai-provider.ts
async function createAiSdkModel(options) {
  switch (options.provider) {
    case "gateway":
      return options.model;
    case "openai": {
      const mod = await import("@ai-sdk/openai");
      return mod.openai(options.model);
    }
    case "anthropic": {
      const mod = await import("@ai-sdk/anthropic");
      return mod.anthropic(options.model);
    }
    case "google": {
      const mod = await import("@ai-sdk/google");
      return mod.google(options.model);
    }
    case "mistral": {
      const mod = await import("@ai-sdk/mistral");
      return mod.mistral(options.model);
    }
    case "xai": {
      const mod = await import("@ai-sdk/xai");
      return mod.xai(options.model);
    }
    case "custom": {
      if (!options.providerModule) throw new Error("--provider-module is required when --provider custom is used");
      const mod = await import(options.providerModule);
      const exported = options.providerExport ? mod[options.providerExport] : mod.default;
      if (typeof exported !== "function") throw new Error("Custom provider export must be a function that accepts a model id");
      return exported(options.model);
    }
    default:
      throw new Error(`Unsupported AI provider: ${String(options.provider)}`);
  }
}

// src/autosetup/scanner.ts
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
var IGNORED_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", ".turbo", ".cache", "vendor"]);
var ALLOWED_EXTENSIONS = /* @__PURE__ */ new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"]);
var MAX_TOTAL_FILES = 400;
function scanProject(root, options) {
  const files = [];
  const packageHints = readPackageHints(root);
  const frameworkHints = inferFrameworkHints(root, packageHints);
  for (const path of walk(root)) {
    if (files.length >= Math.min(options.maxFiles, MAX_TOTAL_FILES)) break;
    const bytes = statSync(path).size;
    if (bytes > 512e3) continue;
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
function* walk(dir) {
  let entries;
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
function readPackageHints(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    return Object.keys({ ...pkg.dependencies ?? {}, ...pkg.devDependencies ?? {} }).sort();
  } catch {
    return [];
  }
}
function inferFrameworkHints(root, packages) {
  const hints = /* @__PURE__ */ new Set();
  const deps = new Set(packages);
  if (deps.has("express")) hints.add("express");
  if (deps.has("fastify")) hints.add("fastify");
  if (deps.has("next")) hints.add("next");
  if (deps.has("@nestjs/core")) hints.add("nestjs");
  if (deps.has("hono")) hints.add("hono");
  if (deps.has("koa")) hints.add("koa");
  try {
    if (statSync(join(root, "app")).isDirectory()) hints.add("next-app-router");
  } catch {
  }
  return [...hints].sort();
}
function inferFileFindings(path, source) {
  const findings = /* @__PURE__ */ new Set();
  const lower = `${path}
${source}`.toLowerCase();
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
function inferRoutes(files) {
  const routes = [];
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
function inferNextRoute(path) {
  if (!/(^|\/)route\.(ts|js)$/.test(path)) return void 0;
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
  return void 0;
}
function riskForPath(path, existing) {
  const risks = new Set(existing);
  const lower = path.toLowerCase();
  if (/login|signin|auth|token|password/.test(lower)) risks.add("auth");
  if (/upload|import|file/.test(lower)) risks.add("upload");
  if (/admin|internal/.test(lower)) risks.add("admin");
  if (/webhook|payment|checkout|stripe|razorpay/.test(lower)) risks.add("payments-or-webhooks");
  if (/graphql/.test(lower)) risks.add("graphql");
  return [...risks].sort();
}
function dedupeRoutes(routes) {
  const map = /* @__PURE__ */ new Map();
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    if (!map.has(key)) map.set(key, route);
  }
  return [...map.values()].slice(0, 100);
}
function isLikelyRouteFile(path, source) {
  return /route\.(ts|js)$/.test(path) || /(?:app|router|fastify)\.(?:get|post|put|patch|delete|all|use)\(/.test(source);
}
function inferLanguage(path) {
  const ext = extensionOf(path);
  if (ext === ".tsx" || ext === ".jsx") return "tsx/jsx";
  if (ext === ".ts") return "typescript";
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return "javascript";
  if (ext === ".json") return "json";
  return "text";
}
function extensionOf(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

// src/autosetup/index.ts
async function runDhalAutosetup(options) {
  const root = resolve(process.cwd(), options.projectRoot);
  const scan = scanProject(root, {
    maxFiles: options.maxFiles,
    maxBytesPerFile: options.maxBytesPerFile
  });
  const heuristic = buildHeuristicProposal(scan);
  const aiResult = options.useAi ? await tryAiProposal(scan, heuristic, options) : { proposal: heuristic, usedAi: false };
  const proposal = aiResult.proposal;
  const outputPath = resolve(root, options.outputPath ?? options.configPath);
  let wroteConfig = false;
  if (options.write) {
    if (existsSync(outputPath) && options.outputPath && outputPath !== resolve(root, options.configPath)) {
    }
    const existing = existsSync(outputPath) ? loadDhalConfig(outputPath) : defaultConfig;
    const merged = deepMerge(existing, proposal.config);
    writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}
`);
    wroteConfig = true;
  }
  return {
    scan: redactScan(scan),
    provider: options.provider,
    model: options.model,
    usedAi: aiResult.usedAi,
    wroteConfig,
    outputPath: wroteConfig ? outputPath : void 0,
    proposal
  };
}
async function tryAiProposal(scan, heuristic, options) {
  try {
    const ai = await import("ai");
    const model = await createAiSdkModel(options);
    const result = await ai.generateText({
      model,
      system: "You are a senior application security engineer. Return only strict JSON. Do not include markdown.",
      prompt: buildPrompt(scan, heuristic)
    });
    const parsed = parseJsonObject(result.text);
    const aiConfig = sanitizeConfigPatch(parsed.config ?? {});
    return {
      usedAi: true,
      proposal: {
        config: deepMerge(heuristic.config, aiConfig),
        rationale: [...heuristic.rationale, ...stringArray(parsed.rationale)],
        warnings: [...heuristic.warnings, ...stringArray(parsed.warnings)]
      }
    };
  } catch (error) {
    return {
      usedAi: false,
      proposal: {
        ...heuristic,
        warnings: [
          ...heuristic.warnings,
          `AI autosetup fell back to deterministic heuristics: ${error instanceof Error ? error.message : String(error)}`
        ]
      }
    };
  }
}
function buildPrompt(scan, heuristic) {
  const payload = {
    task: "Review this Node.js project scan and propose a Dhal WAF config. Keep mode monitor globally unless a route is clearly high risk. Prefer route profiles over broad global blocking.",
    allowedConfigShape: {
      mode: "monitor|block|strict|off",
      trustProxy: "boolean",
      rules: "Dhal rules partial patch",
      routes: "map of route pattern to route profile",
      policy: "policy partial patch"
    },
    outputShape: {
      config: "partial Dhal config patch",
      rationale: ["short reasons"],
      warnings: ["manual checks required"]
    },
    scan: {
      frameworkHints: scan.frameworkHints,
      packageHints: scan.packageHints,
      routes: scan.routes,
      files: scan.files.map((file) => ({ path: file.path, findings: file.findings, snippet: file.snippet }))
    },
    heuristicProposal: heuristic
  };
  return JSON.stringify(payload, null, 2);
}
function parseJsonObject(value) {
  const trimmed = value.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}
function sanitizeConfigPatch(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clone = JSON.parse(JSON.stringify(value));
  if (clone.ip?.reputation && "apiKey" in clone.ip.reputation) {
    delete clone.ip.reputation.apiKey;
  }
  return clone;
}
function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function redactScan(scan) {
  return {
    root: scan.root,
    frameworkHints: scan.frameworkHints,
    packageHints: scan.packageHints,
    routes: scan.routes,
    files: scan.files.map(({ snippet: _snippet, ...file }) => file)
  };
}

export {
  runDhalAutosetup
};
