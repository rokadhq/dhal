"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/autosetup/index.ts
var autosetup_exports = {};
__export(autosetup_exports, {
  runDhalAutosetup: () => runDhalAutosetup
});
module.exports = __toCommonJS(autosetup_exports);
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");

// src/config.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var defaultConfig = {
  mode: "monitor",
  trustProxy: false,
  identity: {
    headers: {
      userId: ["x-dhal-user-id", "x-user-id"],
      tenantId: ["x-dhal-tenant-id", "x-tenant-id"],
      apiKeyId: ["x-dhal-api-key-id", "x-api-key-id"]
    }
  },
  ip: {
    allow: [],
    block: [],
    reputation: {
      enabled: false,
      provider: "abuseipdb",
      apiKeyEnv: "ABUSEIPDB_API_KEY",
      minScore: 75,
      cacheTtlSeconds: 86400,
      maxAgeInDays: 30,
      mode: "async",
      timeoutMs: 750
    }
  },
  rateLimit: {
    enabled: true,
    store: "memory",
    keyBy: ["ip", "route"],
    default: {
      windowSeconds: 60,
      max: 120
    },
    routes: {}
  },
  rules: {
    packs: ["generic-web", "api"],
    sqli: true,
    xss: true,
    pathTraversal: true,
    badUserAgents: true,
    largePayload: {
      enabled: true,
      maxBytes: 1024 * 1024
    },
    api: {
      enabled: false,
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
      suspiciousHeaders: ["x-forwarded-host", "x-original-url", "x-rewrite-url"],
      blockConflictingForwardingHeaders: false
    },
    contentType: {
      enabled: true,
      blockMissingOnBodyMethods: false,
      blockJsonMismatch: true,
      allowedJsonMimeTypes: ["application/json", "application/problem+json", "application/ld+json"]
    },
    bot: {
      enabled: true,
      scoreThreshold: 70,
      blockEmptyUserAgent: false,
      suspiciousUserAgents: [
        "headlesschrome",
        "phantomjs",
        "selenium",
        "puppeteer",
        "playwright",
        "python-requests",
        "aiohttp",
        "httpclient",
        "libwww-perl"
      ],
      allowUserAgents: [],
      falsePositiveControls: {
        minSignals: 2,
        skipStaticAssets: true,
        ignorePaths: ["/healthz", "/health", "/readyz", "/favicon.ico"],
        ignorePrivateIps: false
      },
      signals: {
        missingAcceptHeaderScore: 15,
        emptyUserAgentScore: 30,
        suspiciousUserAgentScore: 45,
        headlessHeaderScore: 35,
        automationHeaderScore: 35,
        browserHeaderMismatchScore: 20
      }
    },
    honeypot: {
      enabled: true,
      headers: ["x-dhal-honeypot", "x-honeypot"],
      queryParams: ["dhal_hp", "_dhal_canary"],
      paths: ["/__dhal_honeypot", "/.env", "/wp-login.php"]
    },
    credentialStuffing: {
      enabled: true,
      loginPathPatterns: ["/api/login", "/login", "/auth/login"],
      failureStatusCodes: [400, 401, 403],
      windowSeconds: 300,
      maxFailures: 8,
      keyBy: ["ip", "route"]
    }
  },
  routes: {},
  policy: {
    severity: {
      default: "low",
      categories: {
        honeypot: "critical",
        credential_stuffing: "high",
        ip: "high",
        signature: "high",
        rate_limit: "medium",
        bot: "medium",
        request: "medium",
        header: "medium",
        api: "medium",
        content_type: "medium"
      },
      rules: {
        "honeypot.triggered": "critical",
        "credential_stuffing.threshold_exceeded": "high",
        "ip.reputation": "high",
        "signature.path_traversal": "critical",
        "signature.sqli": "high",
        "signature.xss": "high",
        "request.large_payload": "medium",
        "rate_limit.exceeded": "medium",
        "bot.suspicious_request": "medium",
        "header.anomaly": "medium",
        "api.positive_security_violation": "medium",
        "content_type.mismatch": "medium"
      }
    },
    suppressions: [],
    sampling: {
      enabled: false,
      rate: 1,
      includeBlocked: true,
      includeWouldBlock: true,
      rules: {},
      routes: {}
    },
    audit: {
      enabled: true,
      includeSuppressed: true
    },
    ci: {
      failOnModes: ["off"],
      requireWebhookSigning: false,
      requireNonMonitorRouteForRules: [],
      disallowExpiredSuppressions: true
    }
  },
  observability: {
    correlation: {
      headers: ["x-request-id", "x-correlation-id", "traceparent"]
    },
    logs: {
      enabled: true,
      format: "json"
    },
    events: {
      enabled: true
    },
    otel: {
      enabled: false,
      serviceName: "dhal-protected-app",
      emitAllowedRequests: false
    },
    webhooks: {
      enabled: false,
      urls: [],
      timeoutMs: 750,
      emitAllowedRequests: false,
      signing: {
        enabled: false,
        secretEnv: "DHAL_WEBHOOK_SECRET",
        signatureHeader: "x-dhal-signature",
        timestampHeader: "x-dhal-timestamp",
        idHeader: "x-dhal-event-id"
      }
    }
  },
  response: {
    blockStatusCode: 403,
    message: "Request blocked by Dhal"
  }
};
function loadDhalConfig(configPath = "dhal.json", override) {
  const resolvedPath = (0, import_node_path.resolve)(process.cwd(), configPath);
  let fileConfig = {};
  if ((0, import_node_fs.existsSync)(resolvedPath)) {
    const raw = (0, import_node_fs.readFileSync)(resolvedPath, "utf8");
    fileConfig = JSON.parse(raw);
  }
  const merged = deepMerge(defaultConfig, fileConfig, override ?? {});
  validateConfig(merged);
  return merged;
}
function deepMerge(...objects) {
  const output = {};
  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj ?? {})) {
      const current = output[key];
      if (Array.isArray(value)) {
        output[key] = value;
      } else if (isPlainObject(value) && isPlainObject(current)) {
        output[key] = deepMerge(current, value);
      } else if (isPlainObject(value)) {
        output[key] = deepMerge({}, value);
      } else if (value !== void 0) {
        output[key] = value;
      }
    }
  }
  return output;
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateConfig(config) {
  assertMode(config.mode, "mode");
  const stores = /* @__PURE__ */ new Set(["memory", "redis"]);
  if (!stores.has(config.rateLimit.store)) {
    throw new Error(`Invalid rateLimit.store: ${config.rateLimit.store}`);
  }
  validateRateLimit("rateLimit.default", config.rateLimit.default.max, config.rateLimit.default.windowSeconds);
  validateKeyBy("rateLimit.keyBy", config.rateLimit.keyBy);
  for (const [pattern, limit] of Object.entries(config.rateLimit.routes)) {
    validateRoutePattern(pattern, `rateLimit.routes.${pattern}`);
    validateRateLimit(`rateLimit.routes.${pattern}`, limit.max, limit.windowSeconds);
  }
  validateRuleConfig("rules", config.rules);
  validateIdentityHeaders(config);
  validateReputation(config);
  validateResponse("response", config.response.blockStatusCode);
  validateObservability(config);
  validatePolicy(config);
  for (const [pattern, profile] of Object.entries(config.routes)) {
    validateRouteProfile(pattern, profile);
  }
}
function validateRouteProfile(pattern, profile) {
  validateRoutePattern(pattern, `routes.${pattern}`);
  if (profile.mode !== void 0) {
    assertMode(profile.mode, `routes.${pattern}.mode`);
  }
  if (profile.rateLimit) {
    if (profile.rateLimit.enabled !== false) {
      const max = profile.rateLimit.max;
      const windowSeconds = profile.rateLimit.windowSeconds;
      if (max !== void 0 || windowSeconds !== void 0) {
        validateRateLimit(`routes.${pattern}.rateLimit`, max ?? 1, windowSeconds ?? 1);
      }
    }
    if (profile.rateLimit.keyBy) {
      validateKeyBy(`routes.${pattern}.rateLimit.keyBy`, profile.rateLimit.keyBy);
    }
  }
  if (profile.rules) {
    if (profile.rules.largePayload?.maxBytes !== void 0 && profile.rules.largePayload.maxBytes < 1) {
      throw new Error(`routes.${pattern}.rules.largePayload.maxBytes must be >= 1`);
    }
    if (profile.rules.bot?.scoreThreshold !== void 0) {
      validateScore(`routes.${pattern}.rules.bot.scoreThreshold`, profile.rules.bot.scoreThreshold);
    }
    if (profile.rules.bot?.falsePositiveControls?.minSignals !== void 0 && (!Number.isInteger(profile.rules.bot.falsePositiveControls.minSignals) || profile.rules.bot.falsePositiveControls.minSignals < 1)) {
      throw new Error(`routes.${pattern}.rules.bot.falsePositiveControls.minSignals must be an integer >= 1`);
    }
    for (const ignoredPath of profile.rules.bot?.falsePositiveControls?.ignorePaths ?? []) {
      validateRoutePattern(ignoredPath, `routes.${pattern}.rules.bot.falsePositiveControls.ignorePaths[]`);
    }
    if (profile.rules.credentialStuffing?.maxFailures !== void 0 && profile.rules.credentialStuffing.maxFailures < 1) {
      throw new Error(`routes.${pattern}.rules.credentialStuffing.maxFailures must be >= 1`);
    }
    if (profile.rules.credentialStuffing?.windowSeconds !== void 0 && profile.rules.credentialStuffing.windowSeconds < 1) {
      throw new Error(`routes.${pattern}.rules.credentialStuffing.windowSeconds must be >= 1`);
    }
    if (profile.rules.credentialStuffing?.keyBy) {
      validateCredentialKeyBy(`routes.${pattern}.rules.credentialStuffing.keyBy`, profile.rules.credentialStuffing.keyBy);
    }
  }
  if (profile.ipReputation?.minScore !== void 0) {
    validateScore(`routes.${pattern}.ipReputation.minScore`, profile.ipReputation.minScore);
  }
  if (profile.ipReputation?.mode !== void 0 && !(/* @__PURE__ */ new Set(["async", "blocking"])).has(profile.ipReputation.mode)) {
    throw new Error(`routes.${pattern}.ipReputation.mode must be async or blocking`);
  }
  if (profile.response?.blockStatusCode !== void 0) {
    validateResponse(`routes.${pattern}.response`, profile.response.blockStatusCode);
  }
}
function validateRuleConfig(path, rules) {
  validateRulePacks(`${path}.packs`, rules.packs);
  if (rules.largePayload.maxBytes < 1) {
    throw new Error(`${path}.largePayload.maxBytes must be >= 1`);
  }
  validateScore(`${path}.bot.scoreThreshold`, rules.bot.scoreThreshold);
  if (!Number.isInteger(rules.bot.falsePositiveControls.minSignals) || rules.bot.falsePositiveControls.minSignals < 1) {
    throw new Error(`${path}.bot.falsePositiveControls.minSignals must be an integer >= 1`);
  }
  for (const pattern of rules.bot.falsePositiveControls.ignorePaths) {
    validateRoutePattern(pattern, `${path}.bot.falsePositiveControls.ignorePaths[]`);
  }
  validateScore(`${path}.bot.signals.missingAcceptHeaderScore`, rules.bot.signals.missingAcceptHeaderScore);
  validateScore(`${path}.bot.signals.emptyUserAgentScore`, rules.bot.signals.emptyUserAgentScore);
  validateScore(`${path}.bot.signals.suspiciousUserAgentScore`, rules.bot.signals.suspiciousUserAgentScore);
  validateScore(`${path}.bot.signals.headlessHeaderScore`, rules.bot.signals.headlessHeaderScore);
  validateScore(`${path}.bot.signals.automationHeaderScore`, rules.bot.signals.automationHeaderScore);
  validateScore(`${path}.bot.signals.browserHeaderMismatchScore`, rules.bot.signals.browserHeaderMismatchScore);
  if (rules.credentialStuffing.maxFailures < 1) {
    throw new Error(`${path}.credentialStuffing.maxFailures must be >= 1`);
  }
  if (rules.credentialStuffing.windowSeconds < 1) {
    throw new Error(`${path}.credentialStuffing.windowSeconds must be >= 1`);
  }
  validateCredentialKeyBy(`${path}.credentialStuffing.keyBy`, rules.credentialStuffing.keyBy);
  for (const statusCode of rules.credentialStuffing.failureStatusCodes) {
    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
      throw new Error(`${path}.credentialStuffing.failureStatusCodes must contain 4xx or 5xx integers`);
    }
  }
  for (const pattern of rules.credentialStuffing.loginPathPatterns) {
    validateRoutePattern(pattern, `${path}.credentialStuffing.loginPathPatterns[]`);
  }
  for (const pattern of rules.honeypot.paths) {
    validateRoutePattern(pattern, `${path}.honeypot.paths[]`);
  }
  if (!Number.isInteger(rules.api.maxJsonDepth) || rules.api.maxJsonDepth < 1) {
    throw new Error(`${path}.api.maxJsonDepth must be an integer >= 1`);
  }
  if (!Number.isInteger(rules.api.maxJsonKeys) || rules.api.maxJsonKeys < 1) {
    throw new Error(`${path}.api.maxJsonKeys must be an integer >= 1`);
  }
  for (const method of rules.api.methodsWithBody) {
    validateHttpMethod(`${path}.api.methodsWithBody[]`, method);
  }
  for (const contentType of rules.api.allowedContentTypes) {
    validateMimePattern(`${path}.api.allowedContentTypes[]`, contentType);
  }
  if (!Number.isInteger(rules.headers.maxHeaderCount) || rules.headers.maxHeaderCount < 1) {
    throw new Error(`${path}.headers.maxHeaderCount must be an integer >= 1`);
  }
  if (!Number.isInteger(rules.headers.maxHeaderBytes) || rules.headers.maxHeaderBytes < 1) {
    throw new Error(`${path}.headers.maxHeaderBytes must be an integer >= 1`);
  }
  for (const header of rules.headers.suspiciousHeaders) {
    validateHeaderName(`${path}.headers.suspiciousHeaders[]`, header);
  }
  for (const contentType of rules.contentType.allowedJsonMimeTypes) {
    validateMimePattern(`${path}.contentType.allowedJsonMimeTypes[]`, contentType);
  }
}
function validatePolicy(config) {
  validateSeverity("policy.severity.default", config.policy.severity.default);
  for (const [category, severity] of Object.entries(config.policy.severity.categories)) {
    if (category.trim().length === 0) throw new Error("policy.severity.categories keys must be non-empty");
    validateSeverity(`policy.severity.categories.${category}`, severity);
  }
  for (const [ruleId, severity] of Object.entries(config.policy.severity.rules)) {
    if (ruleId.trim().length === 0) throw new Error("policy.severity.rules keys must be non-empty");
    validateSeverity(`policy.severity.rules.${ruleId}`, severity);
  }
  validateSampleRate("policy.sampling.rate", config.policy.sampling.rate);
  for (const [ruleId, rate] of Object.entries(config.policy.sampling.rules)) {
    if (ruleId.trim().length === 0) throw new Error("policy.sampling.rules keys must be non-empty");
    validateSampleRate(`policy.sampling.rules.${ruleId}`, rate);
  }
  for (const [pattern, rate] of Object.entries(config.policy.sampling.routes)) {
    validateRoutePattern(pattern, `policy.sampling.routes.${pattern}`);
    validateSampleRate(`policy.sampling.routes.${pattern}`, rate);
  }
  for (const mode of config.policy.ci.failOnModes) {
    assertMode(mode, "policy.ci.failOnModes[]");
  }
  for (const rule of config.policy.ci.requireNonMonitorRouteForRules) {
    if (rule.trim().length === 0) throw new Error("policy.ci.requireNonMonitorRouteForRules must contain non-empty strings");
  }
  const ids = /* @__PURE__ */ new Set();
  for (const suppression of config.policy.suppressions) {
    if (suppression.id.trim().length === 0) throw new Error("policy.suppressions[].id must be non-empty");
    if (ids.has(suppression.id)) throw new Error(`Duplicate policy.suppressions id: ${suppression.id}`);
    ids.add(suppression.id);
    if (suppression.reason.trim().length === 0) throw new Error(`policy.suppressions.${suppression.id}.reason must be non-empty`);
    if (!suppression.ruleId && !suppression.ruleCategory) {
      throw new Error(`policy.suppressions.${suppression.id} must set ruleId or ruleCategory`);
    }
    if (suppression.route) validateRoutePattern(suppression.route, `policy.suppressions.${suppression.id}.route`);
    if (suppression.path) validateRoutePattern(suppression.path, `policy.suppressions.${suppression.id}.path`);
    if (suppression.expiresAt && Number.isNaN(Date.parse(suppression.expiresAt))) {
      throw new Error(`policy.suppressions.${suppression.id}.expiresAt must be an ISO date string`);
    }
  }
}
function validateIdentityHeaders(config) {
  for (const [name, values] of Object.entries(config.identity.headers)) {
    if (!Array.isArray(values)) {
      throw new Error(`identity.headers.${name} must be an array`);
    }
    for (const value of values) {
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`identity.headers.${name} must contain non-empty header names`);
      }
    }
  }
}
function validateReputation(config) {
  validateScore("ip.reputation.minScore", config.ip.reputation.minScore);
  if (config.ip.reputation.cacheTtlSeconds < 1) {
    throw new Error("ip.reputation.cacheTtlSeconds must be >= 1");
  }
  if (config.ip.reputation.maxAgeInDays < 1) {
    throw new Error("ip.reputation.maxAgeInDays must be >= 1");
  }
  if (config.ip.reputation.timeoutMs < 1) {
    throw new Error("ip.reputation.timeoutMs must be >= 1");
  }
  if (!(/* @__PURE__ */ new Set(["async", "blocking"])).has(config.ip.reputation.mode)) {
    throw new Error("ip.reputation.mode must be async or blocking");
  }
}
function validateObservability(config) {
  if (config.observability.webhooks.timeoutMs < 1) {
    throw new Error("observability.webhooks.timeoutMs must be >= 1");
  }
  if (config.observability.webhooks.signing.enabled && config.observability.webhooks.signing.secretEnv.trim().length === 0) {
    throw new Error("observability.webhooks.signing.secretEnv must be non-empty when signing is enabled");
  }
  for (const header of [config.observability.webhooks.signing.signatureHeader, config.observability.webhooks.signing.timestampHeader, config.observability.webhooks.signing.idHeader]) {
    if (header.trim().length === 0) {
      throw new Error("observability.webhooks.signing headers must be non-empty");
    }
  }
  for (const url of config.observability.webhooks.urls) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
    } catch {
      throw new Error(`observability.webhooks.urls contains invalid URL: ${url}`);
    }
  }
}
function validateRoutePattern(pattern, path) {
  if (!pattern.startsWith("/")) {
    throw new Error(`${path} must start with /`);
  }
}
function validateRateLimit(path, max, windowSeconds) {
  if (!Number.isInteger(max) || max < 1) {
    throw new Error(`${path}.max must be an integer >= 1`);
  }
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new Error(`${path}.windowSeconds must be an integer >= 1`);
  }
}
function validateKeyBy(path, keyBy) {
  const allowed = /* @__PURE__ */ new Set(["ip", "route", "userId", "tenantId", "apiKeyId"]);
  if (!Array.isArray(keyBy) || keyBy.length === 0) {
    throw new Error(`${path} must contain at least one key`);
  }
  for (const key of keyBy) {
    if (!allowed.has(key)) {
      throw new Error(`${path} contains invalid key: ${key}`);
    }
  }
}
function validateCredentialKeyBy(path, keyBy) {
  const allowed = /* @__PURE__ */ new Set(["ip", "route", "userId", "tenantId", "apiKeyId", "userAgent"]);
  if (!Array.isArray(keyBy) || keyBy.length === 0) {
    throw new Error(`${path} must contain at least one key`);
  }
  for (const key of keyBy) {
    if (!allowed.has(key)) {
      throw new Error(`${path} contains invalid key: ${key}`);
    }
  }
}
function validateRulePacks(path, packs) {
  const allowed = /* @__PURE__ */ new Set(["generic-web", "api", "auth", "wordpress", "strict-api"]);
  if (!Array.isArray(packs)) throw new Error(`${path} must be an array`);
  for (const pack of packs) {
    if (!allowed.has(pack)) throw new Error(`${path} contains invalid rule pack: ${pack}`);
  }
}
function validateHttpMethod(path, method) {
  if (!/^[A-Z]{2,12}$/.test(method)) {
    throw new Error(`${path} contains invalid HTTP method: ${method}`);
  }
}
function validateHeaderName(path, header) {
  if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/i.test(header)) {
    throw new Error(`${path} contains invalid HTTP header name: ${header}`);
  }
}
function validateMimePattern(path, contentType) {
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+*-]+$/i.test(contentType)) {
    throw new Error(`${path} contains invalid MIME type pattern: ${contentType}`);
  }
}
function assertMode(mode, path) {
  const modes = /* @__PURE__ */ new Set(["off", "monitor", "block", "strict"]);
  if (!modes.has(mode)) {
    throw new Error(`Invalid ${path}: ${mode}`);
  }
}
function validateResponse(path, statusCode) {
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    throw new Error(`${path}.blockStatusCode must be a 4xx or 5xx integer`);
  }
}
function validateScore(path, score) {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(`${path} must be an integer between 0 and 100`);
  }
}
function validateSampleRate(path, rate) {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`${path} must be a number between 0 and 1`);
  }
}
function validateSeverity(path, severity) {
  const severities = /* @__PURE__ */ new Set(["info", "low", "medium", "high", "critical"]);
  if (!severities.has(severity)) {
    throw new Error(`${path} must be one of info, low, medium, high, critical`);
  }
}

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
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
var IGNORED_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", ".turbo", ".cache", "vendor"]);
var ALLOWED_EXTENSIONS = /* @__PURE__ */ new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"]);
var MAX_TOTAL_FILES = 400;
function scanProject(root, options) {
  const files = [];
  const packageHints = readPackageHints(root);
  const frameworkHints = inferFrameworkHints(root, packageHints);
  for (const path of walk(root)) {
    if (files.length >= Math.min(options.maxFiles, MAX_TOTAL_FILES)) break;
    const bytes = (0, import_node_fs2.statSync)(path).size;
    if (bytes > 512e3) continue;
    const rel = (0, import_node_path2.relative)(root, path).replaceAll("\\", "/");
    const raw = (0, import_node_fs2.readFileSync)(path, "utf8");
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
    entries = (0, import_node_fs2.readdirSync)(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = (0, import_node_path2.join)(dir, entry);
    let stat;
    try {
      stat = (0, import_node_fs2.statSync)(full);
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
    const pkg = JSON.parse((0, import_node_fs2.readFileSync)((0, import_node_path2.join)(root, "package.json"), "utf8"));
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
    if ((0, import_node_fs2.statSync)((0, import_node_path2.join)(root, "app")).isDirectory()) hints.add("next-app-router");
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
  const root = (0, import_node_path3.resolve)(process.cwd(), options.projectRoot);
  const scan = scanProject(root, {
    maxFiles: options.maxFiles,
    maxBytesPerFile: options.maxBytesPerFile
  });
  const heuristic = buildHeuristicProposal(scan);
  const aiResult = options.useAi ? await tryAiProposal(scan, heuristic, options) : { proposal: heuristic, usedAi: false };
  const proposal = aiResult.proposal;
  const outputPath = (0, import_node_path3.resolve)(root, options.outputPath ?? options.configPath);
  let wroteConfig = false;
  if (options.write) {
    if ((0, import_node_fs3.existsSync)(outputPath) && options.outputPath && outputPath !== (0, import_node_path3.resolve)(root, options.configPath)) {
    }
    const existing = (0, import_node_fs3.existsSync)(outputPath) ? loadDhalConfig(outputPath) : defaultConfig;
    const merged = deepMerge(existing, proposal.config);
    (0, import_node_fs3.writeFileSync)(outputPath, `${JSON.stringify(merged, null, 2)}
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runDhalAutosetup
});
