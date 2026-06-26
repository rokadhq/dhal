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

// src/adapters/fastify.ts
var fastify_exports = {};
__export(fastify_exports, {
  dhalFastify: () => dhalFastify,
  dhalFastifyFromEngine: () => dhalFastifyFromEngine
});
module.exports = __toCommonJS(fastify_exports);

// src/engine.ts
var import_node_crypto2 = require("crypto");
var import_node_perf_hooks = require("perf_hooks");

// src/config.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var DHAL_CONFIG_SCHEMA_VERSION = "1";
var defaultConfig = {
  schemaVersion: DHAL_CONFIG_SCHEMA_VERSION,
  mode: "monitor",
  trustProxy: false,
  runtime: {
    onInternalError: "allow",
    internalErrorStatusCode: 500,
    maxInspectionMs: 25,
    bypass: {
      enabled: true,
      paths: ["/health", "/healthz", "/ready", "/readyz", "/live", "/livez"],
      methods: ["OPTIONS"]
    }
  },
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
        "ip.allow": "info",
        "ip.block": "high",
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
    redaction: {
      enabled: true,
      ip: "mask",
      identity: "hash",
      userAgent: "full"
    },
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
  if (config.schemaVersion !== DHAL_CONFIG_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${String(config.schemaVersion)}. Expected ${DHAL_CONFIG_SCHEMA_VERSION}. Run \`npx dhal migrate --write\`.`);
  }
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
  validateRuntime(config);
  validateRuleConfig("rules", config.rules);
  validateIdentityHeaders(config);
  validateReputation(config);
  validateResponse("response", config.response.blockStatusCode);
  validateObservability(config);
  validateRedaction(config);
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
function validateRuntime(config) {
  if (!(/* @__PURE__ */ new Set(["allow", "block"])).has(config.runtime.onInternalError)) {
    throw new Error("runtime.onInternalError must be allow or block");
  }
  if (!Number.isInteger(config.runtime.internalErrorStatusCode) || config.runtime.internalErrorStatusCode < 500 || config.runtime.internalErrorStatusCode > 599) {
    throw new Error("runtime.internalErrorStatusCode must be a 5xx integer");
  }
  if (!Number.isFinite(config.runtime.maxInspectionMs) || config.runtime.maxInspectionMs < 0) {
    throw new Error("runtime.maxInspectionMs must be a non-negative number");
  }
  for (const path of config.runtime.bypass.paths) validateRoutePattern(path, "runtime.bypass.paths[]");
  for (const method of config.runtime.bypass.methods) {
    if (!/^[A-Z]+$/.test(method)) throw new Error("runtime.bypass.methods must contain uppercase HTTP methods");
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
function validateRedaction(config) {
  const redactionModes = /* @__PURE__ */ new Set(["none", "mask", "hash", "omit"]);
  if (!redactionModes.has(config.observability.redaction.ip)) {
    throw new Error("observability.redaction.ip must be none, mask, hash, or omit");
  }
  if (!redactionModes.has(config.observability.redaction.identity)) {
    throw new Error("observability.redaction.identity must be none, mask, hash, or omit");
  }
  if (!(/* @__PURE__ */ new Set(["full", "omit"])).has(config.observability.redaction.userAgent)) {
    throw new Error("observability.redaction.userAgent must be full or omit");
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

// src/reputation/abuseipdb.ts
var AbuseIpDbProvider = class {
  constructor(options) {
    this.options = options;
  }
  options;
  name = "abuseipdb";
  async check(ip) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const url = new URL(this.options.endpoint ?? "https://api.abuseipdb.com/api/v2/check");
      url.searchParams.set("ipAddress", ip);
      url.searchParams.set("maxAgeInDays", String(this.options.maxAgeInDays));
      url.searchParams.set("verbose", "true");
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Key: this.options.apiKey
        },
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`AbuseIPDB request failed: ${response.status} ${response.statusText}`);
      }
      const payload = await response.json();
      const data = payload.data;
      const now = Date.now();
      return {
        ip,
        provider: this.name,
        score: Number(data.abuseConfidenceScore ?? 0),
        totalReports: typeof data.totalReports === "number" ? data.totalReports : void 0,
        countryCode: data.countryCode,
        usageType: data.usageType,
        isp: data.isp,
        domain: data.domain,
        checkedAt: now,
        expiresAt: now + this.options.cacheTtlSeconds * 1e3,
        raw: data
      };
    } finally {
      clearTimeout(timeout);
    }
  }
};
function createAbuseIpDbProviderFromConfig(config) {
  const apiKey = process.env[config.ip.reputation.apiKeyEnv];
  if (!apiKey) return void 0;
  return new AbuseIpDbProvider({
    apiKey,
    cacheTtlSeconds: config.ip.reputation.cacheTtlSeconds,
    maxAgeInDays: config.ip.reputation.maxAgeInDays,
    timeoutMs: config.ip.reputation.timeoutMs
  });
}

// src/reputation/cache.ts
var IpReputationCache = class {
  entries = /* @__PURE__ */ new Map();
  inFlight = /* @__PURE__ */ new Set();
  get(ip) {
    const item = this.entries.get(ip);
    if (!item) return void 0;
    if (item.expiresAt <= Date.now()) {
      this.entries.delete(ip);
      return void 0;
    }
    return item;
  }
  set(ip, result) {
    this.entries.set(ip, result);
  }
  markInFlight(ip) {
    if (this.inFlight.has(ip)) return false;
    this.inFlight.add(ip);
    return true;
  }
  clearInFlight(ip) {
    this.inFlight.delete(ip);
  }
  size() {
    return this.entries.size;
  }
};

// src/utils/route.ts
function createRouteSecurityContext(config, path) {
  const matched = pickRouteProfile(config, path);
  if (!matched || matched.profile.enabled === false) {
    return {
      config,
      routePattern: pickRouteLimit(config, path).pattern
    };
  }
  return {
    config: applyRouteProfile(config, matched.pattern, matched.profile),
    routePattern: matched.pattern,
    routeProfile: matched.profile
  };
}
function pickRouteProfile(config, path) {
  let best;
  for (const [pattern, profile] of Object.entries(config.routes)) {
    if (matchesRoutePattern(path, pattern)) {
      const score = routeSpecificityScore(pattern);
      if (!best || score > best.score) {
        best = { pattern, profile, score };
      }
    }
  }
  return best ? { pattern: best.pattern, profile: best.profile } : void 0;
}
function pickRouteLimit(config, path) {
  let best;
  for (const [pattern, limit] of Object.entries(config.rateLimit.routes)) {
    if (matchesRoutePattern(path, pattern)) {
      const score = routeSpecificityScore(pattern);
      if (!best || score > best.score) {
        best = { pattern, limit, score };
      }
    }
  }
  if (best) return { pattern: best.pattern, limit: best.limit };
  return { pattern: "default", limit: config.rateLimit.default };
}
function matchesRoutePattern(path, pattern) {
  if (pattern === path) return true;
  if (!pattern.includes("*")) return false;
  const regex = new RegExp(`^${escapeRegex(pattern).replaceAll("\\*", ".*")}$`);
  return regex.test(path);
}
function applyRouteProfile(config, pattern, profile) {
  const patch = {};
  if (profile.mode) {
    patch.mode = profile.mode;
  }
  if (profile.rules) {
    patch.rules = profile.rules;
  }
  if (profile.rateLimit) {
    const limit = {
      max: profile.rateLimit.max ?? config.rateLimit.default.max,
      windowSeconds: profile.rateLimit.windowSeconds ?? config.rateLimit.default.windowSeconds
    };
    patch.rateLimit = {
      enabled: profile.rateLimit.enabled ?? config.rateLimit.enabled,
      keyBy: profile.rateLimit.keyBy ?? config.rateLimit.keyBy,
      default: limit,
      routes: {
        [pattern]: limit
      }
    };
  }
  if (profile.ipReputation) {
    patch.ip = {
      reputation: {
        enabled: profile.ipReputation.enabled ?? config.ip.reputation.enabled,
        minScore: profile.ipReputation.minScore ?? config.ip.reputation.minScore,
        mode: profile.ipReputation.mode ?? config.ip.reputation.mode
      }
    };
  }
  if (profile.response) {
    patch.response = {
      blockStatusCode: profile.response.blockStatusCode ?? config.response.blockStatusCode,
      message: profile.response.message ?? config.response.message
    };
  }
  return deepMerge(config, patch);
}
function routeSpecificityScore(pattern) {
  return pattern.replaceAll("*", "").length;
}
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/policy.ts
function applyPolicyToDecision(decision, context) {
  const severity = resolveSeverity(decision, context.config, context.ruleCategory);
  const suppression = decision.action === "block" ? findMatchingSuppression(decision, context) : void 0;
  if (!suppression) {
    return {
      ...decision,
      severity,
      meta: {
        ...decision.meta,
        severity
      }
    };
  }
  return {
    ...decision,
    action: "allow",
    statusCode: 200,
    severity,
    wouldBlock: true,
    reason: `Suppressed by policy: ${suppression.reason}`,
    meta: {
      ...decision.meta,
      severity,
      suppressed: true,
      suppressionId: suppression.id,
      suppressionReason: suppression.reason,
      originalAction: decision.action,
      originalStatusCode: decision.statusCode,
      originalReason: decision.reason
    }
  };
}
function resolveSeverity(decision, config, ruleCategory) {
  if (decision.severity) return decision.severity;
  const ruleSeverity = decision.ruleId ? config.policy.severity.rules[decision.ruleId] : void 0;
  if (ruleSeverity) return ruleSeverity;
  const categorySeverity = config.policy.severity.categories[ruleCategory];
  if (categorySeverity) return categorySeverity;
  return config.policy.severity.default;
}
function buildAuditExplanation(event) {
  if (!event.decision.ruleId && event.decision.action === "allow" && !event.decision.wouldBlock) return void 0;
  return {
    ruleId: event.decision.ruleId,
    ruleCategory: event.ruleCategory,
    severity: event.severity,
    reason: event.decision.reason,
    action: event.decision.action,
    wouldBlock: Boolean(event.decision.wouldBlock),
    suppressed: event.decision.meta?.suppressed === true,
    suppressionId: typeof event.decision.meta?.suppressionId === "string" ? event.decision.meta.suppressionId : void 0,
    routePattern: typeof event.decision.meta?.routePattern === "string" ? event.decision.meta.routePattern : void 0,
    routeTags: Array.isArray(event.decision.meta?.routeProfileTags) ? event.decision.meta.routeProfileTags : void 0,
    matchedSignals: Array.isArray(event.decision.meta?.signals) ? event.decision.meta.signals : void 0
  };
}
function shouldEmitSecurityEvent(event, config) {
  if (!config.policy.sampling.enabled) return true;
  if (event.decision.action === "block") return config.policy.sampling.includeBlocked;
  if (event.decision.wouldBlock) return config.policy.sampling.includeWouldBlock;
  const ruleRate = event.decision.ruleId ? config.policy.sampling.rules[event.decision.ruleId] : void 0;
  const routePattern = typeof event.decision.meta?.routePattern === "string" ? event.decision.meta.routePattern : event.request.route ?? event.request.path;
  const routeRate = pickSamplingRouteRate(config, routePattern);
  const rate = ruleRate ?? routeRate ?? config.policy.sampling.rate;
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return stableSample(`${event.request.ip}|${event.request.method}|${event.request.path}|${event.eventId}`, rate);
}
function findMatchingSuppression(decision, context) {
  const now = Date.now();
  return context.config.policy.suppressions.find((suppression) => {
    if (!suppression.enabled) return false;
    if (suppression.expiresAt && Date.parse(suppression.expiresAt) < now) return false;
    if (suppression.ruleId && suppression.ruleId !== decision.ruleId) return false;
    if (suppression.ruleCategory && suppression.ruleCategory !== context.ruleCategory) return false;
    if (suppression.route && !matchesRoutePattern(context.routePattern, suppression.route)) return false;
    if (suppression.path && !matchesRoutePattern(context.req.path, suppression.path)) return false;
    if (suppression.ip && suppression.ip !== context.req.ip) return false;
    if (suppression.userId && suppression.userId !== context.req.userId) return false;
    if (suppression.tenantId && suppression.tenantId !== context.req.tenantId) return false;
    if (suppression.apiKeyId && suppression.apiKeyId !== context.req.apiKeyId) return false;
    return true;
  });
}
function pickSamplingRouteRate(config, routePattern) {
  let best;
  for (const [pattern, rate] of Object.entries(config.policy.sampling.routes)) {
    if (!matchesRoutePattern(routePattern, pattern)) continue;
    const score = pattern.replaceAll("*", "").length;
    if (!best || score > best.score) {
      best = { pattern, rate, score };
    }
  }
  return best?.rate;
}
function stableSample(value, rate) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = (hash >>> 0) / 4294967295;
  return normalized < rate;
}

// src/utils/ip.ts
var import_node_net = require("net");
function normalizeIp(ip) {
  if (!ip) return "0.0.0.0";
  const cleaned = ip.trim().replace(/^\[|\]$/g, "").replace(/^::ffff:/, "");
  if (cleaned === "::1") return "::1";
  return cleaned;
}
function getHeader(headers, name) {
  const lower = name.toLowerCase();
  const direct = headers[lower] ?? headers[name];
  if (Array.isArray(direct)) return direct[0];
  if (direct !== void 0) return direct;
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === lower)?.[1];
  if (Array.isArray(found)) return found[0];
  return found;
}
function extractClientIp(args) {
  if (args.trustProxy) {
    const forwardedFor = getHeader(args.headers, "x-forwarded-for");
    if (forwardedFor) {
      const first = forwardedFor.split(",")[0]?.trim();
      if (first) return normalizeIp(first);
    }
    const realIp = getHeader(args.headers, "x-real-ip");
    if (realIp) return normalizeIp(realIp);
  }
  return normalizeIp(args.socketIp);
}
function matchesIpList(ip, patterns) {
  const normalized = normalizeIp(ip);
  return patterns.some((pattern) => matchesIpPattern(normalized, pattern));
}
function matchesIpPattern(ip, pattern) {
  const normalizedPattern = normalizeIp(pattern);
  if (normalizedPattern === ip) return true;
  if (normalizedPattern.includes("/")) {
    return matchesCidr(ip, normalizedPattern);
  }
  if (normalizedPattern.includes("*") && (0, import_node_net.isIP)(ip) === 4) {
    const regex = new RegExp(
      `^${normalizedPattern.split(".").map((part) => part === "*" ? "\\d{1,3}" : escapeRegex2(part)).join("\\.")}$`
    );
    return regex.test(ip);
  }
  return false;
}
function matchesCidr(ip, cidr) {
  const [range, bitsRaw] = cidr.split("/");
  if (!range || bitsRaw === void 0) return false;
  const bits = Number(bitsRaw);
  const family = (0, import_node_net.isIP)(range);
  if (!Number.isInteger(bits) || family === 0) return false;
  if (family === 4) {
    if (bits < 0 || bits > 32) return false;
    const ipNum2 = ipv4ToBigInt(ip);
    const rangeNum2 = ipv4ToBigInt(range);
    if (ipNum2 === null || rangeNum2 === null) return false;
    return matchesBigIntCidr(ipNum2, rangeNum2, bits, 32);
  }
  if (bits < 0 || bits > 128) return false;
  const ipNum = ipv6ToBigInt(ip);
  const rangeNum = ipv6ToBigInt(range);
  if (ipNum === null || rangeNum === null) return false;
  return matchesBigIntCidr(ipNum, rangeNum, bits, 128);
}
function matchesBigIntCidr(ip, range, bits, width) {
  if (bits === 0) return true;
  const shift = BigInt(width - bits);
  return ip >> shift === range >> shift;
}
function ipv4ToBigInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return BigInt((parts[0] << 24 >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3] >>> 0);
}
function ipv6ToBigInt(ip) {
  if ((0, import_node_net.isIP)(ip) !== 6) return null;
  const normalized = expandIpv6(ip);
  if (!normalized) return null;
  return normalized.reduce((acc, group) => (acc << 16n) + BigInt(group), 0n);
}
function expandIpv6(ip) {
  const [headRaw = "", tailRaw = ""] = ip.split("::");
  if (ip.split("::").length > 2) return null;
  const head = parseIpv6Groups(headRaw);
  const tail = parseIpv6Groups(tailRaw);
  if (!head || !tail) return null;
  if (ip.includes("::")) {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    return [...head, ...Array.from({ length: missing }, () => 0), ...tail];
  }
  return head.length === 8 ? head : null;
}
function parseIpv6Groups(value) {
  if (!value) return [];
  const groups = value.split(":");
  const output = [];
  for (const group of groups) {
    if (group.includes(".")) {
      const ipv4 = ipv4ToBigInt(group);
      if (ipv4 === null) return null;
      output.push(Number(ipv4 >> 16n & 0xffffn), Number(ipv4 & 0xffffn));
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    output.push(Number.parseInt(group, 16));
  }
  return output;
}
function escapeRegex2(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function isPrivateIp(ip) {
  const normalized = normalizeIp(ip);
  if (normalized === "::1" || normalized === "localhost") return true;
  if ((0, import_node_net.isIP)(normalized) === 6) {
    return matchesIpList(normalized, ["fc00::/7", "fe80::/10", "::1/128"]);
  }
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

// src/rules/api-rules.ts
function evaluateApiPositiveSecurityRule(req, config) {
  const rule = config.rules.api;
  if (!rule.enabled) return void 0;
  const method = req.method.toUpperCase();
  if (!rule.methodsWithBody.includes(method)) return void 0;
  const contentType = normalizeContentType(getHeader(req.headers, "content-type"));
  const hasBody = req.body !== void 0 || req.rawBody !== void 0 || Number(getHeader(req.headers, "content-length") ?? 0) > 0;
  if (rule.requireJsonContentType && hasBody && (!contentType || !matchesMime(contentType, rule.allowedContentTypes))) {
    return block(config, "API endpoint received a non-JSON request body", 65, {
      check: "requireJsonContentType",
      method,
      contentType: contentType ?? "missing",
      allowedContentTypes: rule.allowedContentTypes,
      confidence: 0.84
    });
  }
  const json = getJsonValue(req);
  if (json !== void 0) {
    const stats = inspectJson(json);
    if (stats.depth > rule.maxJsonDepth) {
      return block(config, "JSON body exceeds maximum configured depth", 65, {
        check: "maxJsonDepth",
        depth: stats.depth,
        maxJsonDepth: rule.maxJsonDepth,
        confidence: 0.86
      });
    }
    if (stats.keys > rule.maxJsonKeys) {
      return block(config, "JSON body exceeds maximum configured key count", 65, {
        check: "maxJsonKeys",
        keys: stats.keys,
        maxJsonKeys: rule.maxJsonKeys,
        confidence: 0.86
      });
    }
  }
  return void 0;
}
function block(config, reason, score, meta) {
  return {
    action: "block",
    statusCode: config.response.blockStatusCode,
    reason,
    ruleId: "api.positive_security_violation",
    score,
    meta: {
      ...meta,
      threatKind: "api"
    }
  };
}
function getJsonValue(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.rawBody === "string") return parseJsonOrUndefined(req.rawBody);
  if (Buffer.isBuffer(req.rawBody)) return parseJsonOrUndefined(req.rawBody.toString("utf8"));
  if (typeof req.body === "string") return parseJsonOrUndefined(req.body);
  return void 0;
}
function parseJsonOrUndefined(value) {
  const trimmed = value.trim();
  if (!trimmed || !/^[\[{]/.test(trimmed)) return void 0;
  try {
    return JSON.parse(trimmed);
  } catch {
    return void 0;
  }
}
function inspectJson(value, depth = 0) {
  if (Array.isArray(value)) {
    return value.reduce((acc, item) => {
      const child = inspectJson(item, depth + 1);
      return { depth: Math.max(acc.depth, child.depth), keys: acc.keys + child.keys };
    }, { depth: depth + 1, keys: 0 });
  }
  if (value && typeof value === "object") {
    const entries = Object.values(value);
    return entries.reduce((acc, item) => {
      const child = inspectJson(item, depth + 1);
      return { depth: Math.max(acc.depth, child.depth), keys: acc.keys + child.keys };
    }, { depth: depth + 1, keys: Object.keys(value).length });
  }
  return { depth, keys: 0 };
}
function normalizeContentType(value) {
  return value?.split(";")[0]?.trim().toLowerCase();
}
function matchesMime(value, patterns) {
  return patterns.some((pattern) => {
    const normalized = pattern.toLowerCase();
    if (normalized.endsWith("/*")) return value.startsWith(normalized.slice(0, -1));
    return normalized === value;
  });
}

// src/rules/bot-rule.ts
function evaluateBotRule(req, config) {
  const rule = config.rules.bot;
  if (!rule.enabled) return void 0;
  const controls = rule.falsePositiveControls;
  const path = req.route ?? req.path;
  if (controls.skipStaticAssets && isStaticAssetPath(req.path)) return void 0;
  if (controls.ignorePrivateIps && isPrivateIp(req.ip)) return void 0;
  if (controls.ignorePaths.some((pattern) => matchesRoutePattern(path, pattern) || matchesRoutePattern(req.path, pattern))) {
    return void 0;
  }
  const userAgent = getHeader(req.headers, "user-agent") ?? "";
  const lowerUserAgent = userAgent.toLowerCase();
  const allowHit = rule.allowUserAgents.some((pattern) => lowerUserAgent.includes(pattern.toLowerCase()));
  if (allowHit) return void 0;
  const signals = [];
  if (!userAgent.trim()) {
    signals.push({ name: "empty_user_agent", score: rule.signals.emptyUserAgentScore });
  }
  const suspiciousPattern = rule.suspiciousUserAgents.find((pattern) => lowerUserAgent.includes(pattern.toLowerCase()));
  if (suspiciousPattern) {
    signals.push({ name: "suspicious_user_agent", score: rule.signals.suspiciousUserAgentScore, detail: suspiciousPattern });
  }
  if (!getHeader(req.headers, "accept")) {
    signals.push({ name: "missing_accept_header", score: rule.signals.missingAcceptHeaderScore });
  }
  if (hasAnyHeader(req, ["x-phantomjs", "x-headless", "x-playwright", "x-puppeteer", "sec-ch-ua-full-version-list"]) && /headless|phantom|playwright|puppeteer/i.test(userAgent)) {
    signals.push({ name: "headless_browser_hint", score: rule.signals.headlessHeaderScore });
  }
  if (hasAnyHeader(req, ["x-automated", "x-bot", "x-scraper", "x-crawler"])) {
    signals.push({ name: "automation_header", score: rule.signals.automationHeaderScore });
  }
  if (looksLikeBrowser(userAgent) && !getHeader(req.headers, "accept-language") && !getHeader(req.headers, "sec-fetch-site")) {
    signals.push({ name: "browser_header_mismatch", score: rule.signals.browserHeaderMismatchScore });
  }
  const score = Math.min(100, signals.reduce((sum, signal) => sum + signal.score, 0));
  const hasEnoughSignals = signals.length >= controls.minSignals;
  const explicitEmptyUserAgentBlock = rule.blockEmptyUserAgent && !userAgent.trim();
  const shouldBlock = explicitEmptyUserAgentBlock || score >= rule.scoreThreshold && hasEnoughSignals;
  if (!shouldBlock) return void 0;
  return {
    action: "block",
    statusCode: config.response.blockStatusCode,
    reason: "Suspicious bot-like request behavior",
    ruleId: "bot.suspicious_request",
    score,
    meta: {
      threatKind: "bot",
      signals,
      signalCount: signals.length,
      minSignals: controls.minSignals,
      userAgent: userAgent || "<empty>"
    }
  };
}
function hasAnyHeader(req, names) {
  return names.some((name) => getHeader(req.headers, name) !== void 0);
}
function looksLikeBrowser(userAgent) {
  return /mozilla|chrome|safari|firefox|edge|edg\//i.test(userAgent);
}
function isStaticAssetPath(path) {
  return /\.(?:avif|css|gif|ico|jpeg|jpg|js|map|png|svg|txt|webp|woff2?)$/i.test(path);
}

// src/rules/content-type-rule.ts
function evaluateContentTypeRule(req, config) {
  const rule = config.rules.contentType;
  if (!rule.enabled) return void 0;
  const method = req.method.toUpperCase();
  const hasBody = hasRequestBody(req, config.rules.api.methodsWithBody);
  const contentType = normalizeContentType2(getHeader(req.headers, "content-type"));
  if (hasBody && rule.blockMissingOnBodyMethods && !contentType) {
    return block2(config, "Request body method missing Content-Type", 45, {
      check: "missingContentType",
      method,
      confidence: 0.62
    });
  }
  if (rule.blockJsonMismatch && contentType && matchesMime2(contentType, rule.allowedJsonMimeTypes)) {
    const raw = getRawBody(req);
    if (raw && !looksLikeJson(raw)) {
      return block2(config, "JSON Content-Type does not match request body", 70, {
        check: "jsonBodyMismatch",
        contentType,
        confidence: 0.9
      });
    }
  }
  return void 0;
}
function block2(config, reason, score, meta) {
  return {
    action: "block",
    statusCode: config.response.blockStatusCode,
    reason,
    ruleId: "content_type.mismatch",
    score,
    meta: {
      ...meta,
      threatKind: "content_type"
    }
  };
}
function hasRequestBody(req, methodsWithBody) {
  const method = req.method.toUpperCase();
  const configuredMethod = methodsWithBody.includes(method);
  const length = getHeader(req.headers, "content-length");
  const parsedLength = length ? Number(length) : void 0;
  return configuredMethod && (parsedLength === void 0 || parsedLength > 0 || req.rawBody !== void 0 || req.body !== void 0);
}
function getRawBody(req) {
  if (typeof req.rawBody === "string") return req.rawBody.trim();
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString("utf8").trim();
  if (typeof req.body === "string") return req.body.trim();
  return void 0;
}
function looksLikeJson(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!/^[\[{"0-9tfn-]/i.test(trimmed)) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
function normalizeContentType2(value) {
  return value?.split(";")[0]?.trim().toLowerCase();
}
function matchesMime2(value, patterns) {
  return patterns.some((pattern) => {
    const normalized = pattern.toLowerCase();
    if (normalized.endsWith("/*")) return value.startsWith(normalized.slice(0, -1));
    return normalized === value;
  });
}

// src/rules/credential-stuffing-rule.ts
async function evaluateCredentialStuffingRule(args) {
  const { req, config, store } = args;
  const rule = config.rules.credentialStuffing;
  if (!rule.enabled || !isCredentialRoute(req, config)) return void 0;
  const key = buildCredentialKey(req, rule.keyBy);
  const state = await store.count(key);
  if (state.count < rule.maxFailures) return void 0;
  return {
    action: "block",
    statusCode: 429,
    reason: "Credential stuffing threshold exceeded",
    ruleId: "credential_stuffing.threshold_exceeded",
    score: 90,
    meta: {
      threatKind: "credential_stuffing",
      key,
      failures: state.count,
      maxFailures: rule.maxFailures,
      resetAt: state.resetAt
    }
  };
}
async function recordCredentialOutcome(args) {
  const { req, config, store, outcome } = args;
  const rule = config.rules.credentialStuffing;
  if (!rule.enabled || !isCredentialRoute(req, config)) return void 0;
  if (!rule.failureStatusCodes.includes(outcome.statusCode)) return void 0;
  const key = buildCredentialKey(req, rule.keyBy);
  const result = await store.record(key, rule.windowSeconds);
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    kind: "credential_failure",
    key,
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      route: req.route,
      userId: req.userId,
      tenantId: req.tenantId,
      apiKeyId: req.apiKeyId
    },
    meta: {
      statusCode: outcome.statusCode,
      count: result.count,
      resetAt: result.resetAt,
      maxFailures: rule.maxFailures
    }
  };
}
function isCredentialRoute(req, config) {
  const routeOrPath = req.route ?? req.path;
  return config.rules.credentialStuffing.loginPathPatterns.some(
    (pattern) => matchesRoutePattern(routeOrPath, pattern) || matchesRoutePattern(req.path, pattern)
  );
}
function buildCredentialKey(req, keyBy) {
  return keyBy.map((key) => {
    if (key === "route") return `route:${req.route ?? req.path}`;
    if (key === "userAgent") return `userAgent:${getHeader(req.headers, "user-agent") ?? "unknown"}`;
    return `${key}:${req[key] ?? "anonymous"}`;
  }).join("|");
}

// src/rules/header-rules.ts
function evaluateHeaderRules(req, config) {
  const rule = config.rules.headers;
  if (!rule.enabled) return void 0;
  const entries = Object.entries(req.headers);
  const headerCount = entries.length;
  const headerBytes = entries.reduce((sum, [name, value]) => sum + name.length + headerValueBytes(value), 0);
  if (headerCount > rule.maxHeaderCount) {
    return block3(config, "Header count exceeds configured maximum", 60, {
      check: "maxHeaderCount",
      headerCount,
      maxHeaderCount: rule.maxHeaderCount,
      confidence: 0.82
    });
  }
  if (headerBytes > rule.maxHeaderBytes) {
    return block3(config, "Header bytes exceed configured maximum", 60, {
      check: "maxHeaderBytes",
      headerBytes,
      maxHeaderBytes: rule.maxHeaderBytes,
      confidence: 0.82
    });
  }
  if (rule.requireHostHeader && !getHeader(req.headers, "host")) {
    return block3(config, "Missing Host header", 45, {
      check: "missingHost",
      confidence: 0.65
    });
  }
  for (const headerName of rule.suspiciousHeaders) {
    const value = getHeader(req.headers, headerName);
    if (value) {
      return block3(config, "Suspicious proxy or rewrite header present", 65, {
        check: "suspiciousHeader",
        headerName,
        confidence: 0.76
      });
    }
  }
  if (rule.blockConflictingForwardingHeaders) {
    const forwardedFor = getHeader(req.headers, "x-forwarded-for");
    const realIp = getHeader(req.headers, "x-real-ip");
    if (forwardedFor && realIp && forwardedFor.split(",")[0]?.trim() !== realIp.trim()) {
      return block3(config, "Conflicting forwarding headers", 55, {
        check: "conflictingForwardingHeaders",
        confidence: 0.68
      });
    }
  }
  return void 0;
}
function block3(config, reason, score, meta) {
  return {
    action: "block",
    statusCode: config.response.blockStatusCode,
    reason,
    ruleId: "header.anomaly",
    score,
    meta: {
      ...meta,
      threatKind: "header"
    }
  };
}
function headerValueBytes(value) {
  if (value === void 0) return 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + item.length, 0);
  return value.length;
}

// src/rules/honeypot-rule.ts
function evaluateHoneypotRule(req, config) {
  const rule = config.rules.honeypot;
  if (!rule.enabled) return void 0;
  for (const path of rule.paths) {
    if (matchesRoutePattern(req.path, path)) {
      return block4(config, "path", path);
    }
  }
  const params = readQueryParams(req.url);
  for (const param of rule.queryParams) {
    if (params.has(param)) {
      return block4(config, "query_param", param);
    }
  }
  for (const header of rule.headers) {
    if (getHeader(req.headers, header) !== void 0) {
      return block4(config, "header", header.toLowerCase());
    }
  }
  return void 0;
}
function block4(config, matchedType, matchedValue) {
  return {
    action: "block",
    statusCode: config.response.blockStatusCode,
    reason: "Honeypot canary was triggered",
    ruleId: "honeypot.triggered",
    score: 95,
    meta: {
      matchedType,
      matchedValue,
      threatKind: "honeypot"
    }
  };
}
function readQueryParams(url) {
  try {
    return new URL(url, "http://dhal.local").searchParams;
  } catch {
    const query = url.split("?")[1] ?? "";
    return new URLSearchParams(query);
  }
}

// src/rules/ip-rules.ts
function evaluateIpRules(req, config) {
  if (matchesIpList(req.ip, config.ip.allow)) {
    return {
      action: "allow",
      statusCode: 200,
      reason: "IP allowlisted",
      ruleId: "ip.allow",
      score: 0
    };
  }
  if (matchesIpList(req.ip, config.ip.block)) {
    return {
      action: "block",
      statusCode: config.response.blockStatusCode,
      reason: "IP blocklisted",
      ruleId: "ip.block",
      score: 100
    };
  }
  return void 0;
}

// src/rules/ip-reputation-rule.ts
function createIpReputationEvaluator(args) {
  const { config, provider, logger = console } = args;
  const cache = args.cache ?? new IpReputationCache();
  return {
    async evaluate(req) {
      if (!config.ip.reputation.enabled || !provider) return void 0;
      const cached = cache.get(req.ip);
      if (cached) return decisionFromResult(req.ip, config, cached);
      if (config.ip.reputation.mode === "blocking") {
        try {
          const result = await provider.check(req.ip);
          cache.set(req.ip, result);
          return decisionFromResult(req.ip, config, result);
        } catch (error) {
          logger.warn(`[dhal] IP reputation lookup failed for ${req.ip}: ${error instanceof Error ? error.message : String(error)}`);
          return void 0;
        }
      }
      if (cache.markInFlight(req.ip)) {
        void provider.check(req.ip).then((result) => cache.set(req.ip, result)).catch((error) => logger.warn(`[dhal] async IP reputation lookup failed for ${req.ip}: ${error instanceof Error ? error.message : String(error)}`)).finally(() => cache.clearInFlight(req.ip));
      }
      return void 0;
    }
  };
}
function decisionFromResult(ip, config, result) {
  if (result.score < config.ip.reputation.minScore) return void 0;
  return {
    action: "block",
    statusCode: config.response.blockStatusCode,
    reason: `IP reputation score ${result.score} exceeds threshold ${config.ip.reputation.minScore}`,
    ruleId: "ip.reputation",
    score: Math.max(75, result.score),
    meta: {
      ip,
      provider: result.provider,
      reputationScore: result.score,
      totalReports: result.totalReports,
      countryCode: result.countryCode,
      usageType: result.usageType,
      isp: result.isp,
      domain: result.domain,
      checkedAt: result.checkedAt,
      expiresAt: result.expiresAt
    }
  };
}

// src/rules/rate-limit-rule.ts
async function evaluateRateLimitRule(args) {
  const { req, config, store } = args;
  if (!config.rateLimit.enabled) return void 0;
  const { pattern, limit } = pickRouteLimit(config, req.route ?? req.path);
  const key = buildRateLimitKey(req, config, pattern);
  const result = await store.consume(key, limit);
  if (result.allowed) return void 0;
  return {
    action: "block",
    statusCode: 429,
    reason: "Rate limit exceeded",
    ruleId: "rate_limit.exceeded",
    score: 80,
    meta: {
      key,
      routePattern: pattern,
      limit,
      remaining: result.remaining,
      resetAt: result.resetAt
    }
  };
}
function buildRateLimitKey(req, config, routePattern) {
  const parts = config.rateLimit.keyBy.map((key) => {
    if (key === "route") return `route:${routePattern}`;
    return `${key}:${req[key] ?? "anonymous"}`;
  });
  return parts.join("|");
}

// src/rules/signature-rules.ts
var BAD_USER_AGENTS = /(?:sqlmap|nikto|nmap|masscan|acunetix|nessus|wpscan|dirbuster|gobuster|zgrab|curl\/7\.29\.0)/i;
var SIGNATURES = [
  {
    id: "signature.sqli",
    category: "sqli",
    enabled: (config) => config.rules.sqli,
    target: requestSurface,
    pattern: /(?:\bunion\b\s+\bselect\b|\bselect\b.+\bfrom\b|\bor\b\s+['"]?1['"]?\s*=\s*['"]?1|sleep\s*\(|benchmark\s*\(|information_schema|extractvalue\s*\(|updatexml\s*\()/i,
    score: 70,
    confidence: 0.78,
    reason: "Potential SQL injection pattern"
  },
  {
    id: "signature.xss",
    category: "xss",
    enabled: (config) => config.rules.xss,
    target: requestSurface,
    pattern: /(?:<\s*script\b|javascript\s*:|onerror\s*=|onload\s*=|<\s*iframe\b|document\.cookie|\balert\s*\()/i,
    score: 70,
    confidence: 0.76,
    reason: "Potential XSS pattern"
  },
  {
    id: "signature.path_traversal",
    category: "path_traversal",
    enabled: (config) => config.rules.pathTraversal,
    target: requestSurface,
    pattern: /(?:\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%252e%252e%252f|\/etc\/passwd|c:\\windows|boot\.ini)/i,
    score: 85,
    confidence: 0.9,
    reason: "Potential path traversal pattern"
  },
  {
    id: "signature.bad_user_agent",
    category: "bad_user_agent",
    enabled: (config) => config.rules.badUserAgents,
    target: (req) => getHeader(req.headers, "user-agent") ?? "",
    pattern: BAD_USER_AGENTS,
    score: 60,
    confidence: 0.82,
    reason: "Known suspicious user agent"
  },
  {
    id: "signature.ssrf.metadata",
    category: "ssrf",
    packs: ["api", "strict-api", "generic-web"],
    enabled: (config) => hasAnyPack(config, ["api", "strict-api", "generic-web"]),
    target: requestSurface,
    pattern: /(?:169\.254\.169\.254|metadata\.google\.internal|100\.100\.100\.200|metadata\.aws|latest\/meta-data)/i,
    score: 88,
    confidence: 0.91,
    reason: "Potential SSRF attempt against cloud metadata service"
  },
  {
    id: "signature.rce.shell",
    category: "rce",
    packs: ["generic-web", "api", "strict-api"],
    enabled: (config) => hasAnyPack(config, ["generic-web", "api", "strict-api"]),
    target: requestSurface,
    pattern: /(?:;\s*(?:cat|curl|wget|bash|sh|nc|python|perl)\b|`\s*(?:id|whoami|curl|wget)|\$\([^)]*(?:id|whoami|curl|wget|bash)[^)]*\))/i,
    score: 86,
    confidence: 0.84,
    reason: "Potential command injection or remote code execution pattern"
  },
  {
    id: "signature.graphql.introspection",
    category: "graphql",
    packs: ["api", "strict-api"],
    enabled: (config) => hasAnyPack(config, ["api", "strict-api"]),
    target: requestSurface,
    pattern: /(?:__schema|__type|IntrospectionQuery)/,
    score: 55,
    confidence: 0.68,
    reason: "GraphQL introspection probe"
  },
  {
    id: "signature.template_injection",
    category: "template_injection",
    packs: ["generic-web", "api", "strict-api"],
    enabled: (config) => hasAnyPack(config, ["generic-web", "api", "strict-api"]),
    target: requestSurface,
    pattern: /(?:\{\{\s*(?:7\s*\*\s*7|config|constructor)|<%=|\$\{\s*(?:jndi|java|env|process\.env))/i,
    score: 82,
    confidence: 0.79,
    reason: "Potential server-side template injection pattern"
  },
  {
    id: "signature.wordpress.probe",
    category: "wordpress",
    packs: ["wordpress"],
    enabled: (config) => hasAnyPack(config, ["wordpress"]),
    target: requestSurface,
    pattern: /(?:\/wp-admin\b|\/wp-content\b|\/wp-config\.php|\/xmlrpc\.php|\/wp-json\/wp\/v2\/users)/i,
    score: 70,
    confidence: 0.83,
    reason: "WordPress-specific probe against a protected application"
  }
];
function evaluateSignatureRules(req, config) {
  const payloadDecision = evaluateLargePayload(req, config);
  if (payloadDecision) return payloadDecision;
  for (const rule of SIGNATURES) {
    if (!rule.enabled(config)) continue;
    const target = rule.target(req);
    if (target.length > 64e3) continue;
    if (rule.pattern.test(target)) {
      return {
        action: "block",
        statusCode: config.response.blockStatusCode,
        reason: rule.reason,
        ruleId: rule.id,
        score: rule.score,
        meta: {
          signatureCategory: rule.category,
          confidence: rule.confidence,
          packs: rule.packs ?? config.rules.packs,
          threatKind: "signature"
        }
      };
    }
  }
  return void 0;
}
function evaluateLargePayload(req, config) {
  if (!config.rules.largePayload.enabled) return void 0;
  const contentLength = getContentLength(req.headers) ?? req.contentLength;
  if (contentLength === void 0) return void 0;
  if (contentLength > config.rules.largePayload.maxBytes) {
    return {
      action: "block",
      statusCode: 413,
      reason: "Payload too large",
      ruleId: "request.large_payload",
      score: 50,
      meta: {
        contentLength,
        maxBytes: config.rules.largePayload.maxBytes,
        confidence: 0.95,
        threatKind: "request"
      }
    };
  }
  return void 0;
}
function requestSurface(req) {
  const body = typeof req.rawBody === "string" ? req.rawBody : Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : typeof req.body === "string" ? req.body : req.body && typeof req.body === "object" ? JSON.stringify(req.body).slice(0, 64e3) : "";
  const raw = `${req.method} ${req.url}
${body}`;
  const decodedOnce = decodeLoose(raw);
  const decodedTwice = decodedOnce === raw ? decodedOnce : decodeLoose(decodedOnce);
  return [raw, decodedOnce, decodedTwice].filter((value, index, values) => values.indexOf(value) === index).join("\n");
}
function decodeLoose(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}
function hasAnyPack(config, packs) {
  return packs.some((pack) => config.rules.packs.includes(pack));
}
function getContentLength(headers) {
  const raw = getHeader(headers, "content-length");
  if (!raw) return void 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : void 0;
}

// src/stores/memory-rate-limit-store.ts
var MemoryRateLimitStore = class {
  buckets = /* @__PURE__ */ new Map();
  async consume(key, limit) {
    const now = Date.now();
    const windowMs = limit.windowSeconds * 1e3;
    const refillPerMs = limit.max / windowMs;
    const existing = this.buckets.get(key) ?? {
      tokens: limit.max,
      lastRefillMs: now
    };
    const elapsedMs = Math.max(0, now - existing.lastRefillMs);
    const refilled = Math.min(limit.max, existing.tokens + elapsedMs * refillPerMs);
    const allowed = refilled >= 1;
    const nextTokens = allowed ? refilled - 1 : refilled;
    this.buckets.set(key, {
      tokens: nextTokens,
      lastRefillMs: now
    });
    const missingTokens = Math.max(0, 1 - nextTokens);
    const resetAt = now + Math.ceil(missingTokens / refillPerMs);
    if (this.buckets.size > 1e4) {
      this.sweep(now, windowMs);
    }
    return {
      allowed,
      remaining: Math.floor(nextTokens),
      resetAt
    };
  }
  sweep(now, ttlMs) {
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefillMs > ttlMs * 2) {
        this.buckets.delete(key);
      }
    }
  }
};

// src/stores/memory-signal-store.ts
var MemorySignalStore = class {
  buckets = /* @__PURE__ */ new Map();
  async record(key, windowSeconds) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const bucket = { count: 1, resetAt: now + windowSeconds * 1e3 };
      this.buckets.set(key, bucket);
      return bucket;
    }
    existing.count += 1;
    return existing;
  }
  async count(key) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.delete(key);
      return { count: 0, resetAt: now };
    }
    return existing;
  }
};

// src/telemetry/composite.ts
var CompositeDhalTelemetry = class {
  constructor(delegates) {
    this.delegates = delegates;
  }
  delegates;
  recordDecision(event) {
    for (const delegate of this.delegates) {
      try {
        delegate.recordDecision(event);
      } catch {
      }
    }
  }
  async flush(timeoutMs) {
    const results = await Promise.allSettled(
      this.delegates.map(async (delegate) => delegate.flush?.(timeoutMs))
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
  }
  async close(timeoutMs) {
    const results = await Promise.allSettled(
      this.delegates.map(async (delegate) => {
        if (delegate.close) await delegate.close(timeoutMs);
        else await delegate.flush?.(timeoutMs);
      })
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
  }
  getHealth() {
    const health = this.delegates.map((delegate) => delegate.getHealth?.()).filter((value) => value !== void 0);
    return health.reduce((total, current) => ({
      pending: total.pending + current.pending,
      delivered: total.delivered + current.delivered,
      failed: total.failed + current.failed,
      dropped: total.dropped + current.dropped,
      closed: total.closed && current.closed
    }), {
      pending: 0,
      delivered: 0,
      failed: 0,
      dropped: 0,
      closed: health.length > 0
    });
  }
};

// src/telemetry/events.ts
var import_node_events = require("events");
var DhalEventBus = class extends import_node_events.EventEmitter {
  constructor(onListenerError) {
    super();
    this.onListenerError = onListenerError;
  }
  onListenerError;
  emitDecision(event) {
    this.emitSafely("decision", event);
    if (event.decision.action === "block" || event.decision.wouldBlock) {
      this.emitSafely("threat", event);
      if (event.threatKind) {
        this.emitSafely(`threat:${event.threatKind}`, event);
      }
    }
  }
  emitSignal(signal) {
    this.emitSafely("signal", signal);
    this.emitSafely(`signal:${signal.kind}`, signal);
  }
  onDecision(listener) {
    return this.on("decision", listener);
  }
  onThreat(listener) {
    return this.on("threat", listener);
  }
  onSignal(listener) {
    return this.on("signal", listener);
  }
  emitSafely(eventName, payload) {
    for (const listener of this.rawListeners(eventName)) {
      try {
        Reflect.apply(listener, this, [payload]);
      } catch (error) {
        try {
          this.onListenerError?.({ eventName, error });
        } catch {
        }
      }
    }
  }
};

// src/telemetry/lifecycle.ts
async function flushDhalTelemetry(telemetry, timeoutMs) {
  const managed = telemetry;
  await managed?.flush?.(timeoutMs);
}
async function closeDhalTelemetry(telemetry, timeoutMs) {
  const managed = telemetry;
  if (managed?.close) {
    await managed.close(timeoutMs);
    return;
  }
  await managed?.flush?.(timeoutMs);
}
function getDhalTelemetryHealth(telemetry) {
  return telemetry?.getHealth?.();
}

// src/compatibility.ts
var DHAL_PACKAGE_VERSION = "1.0.0";

// src/telemetry/otel.ts
var OpenTelemetryDhalTelemetry = class {
  constructor(options) {
    this.options = options;
  }
  options;
  apiPromise;
  recordDecision(event) {
    if (!this.options.emitAllowedRequests && event.decision.action === "allow" && !event.decision.wouldBlock) {
      return;
    }
    void this.loadApi().then((api) => {
      if (!api) return;
      const tracer = api.trace.getTracer("dhal", DHAL_PACKAGE_VERSION);
      const meter = api.metrics.getMeter("dhal", DHAL_PACKAGE_VERSION);
      const attributes = toAttributes(event, this.options.serviceName);
      const span = tracer.startSpan("dhal.inspect", { attributes });
      span.setStatus({
        code: event.decision.action === "block" || event.decision.wouldBlock ? api.SpanStatusCode.ERROR : api.SpanStatusCode.OK,
        message: event.decision.reason
      });
      span.end();
      meter.createCounter("dhal.requests.total").add(1, attributes);
      if (event.decision.action === "block" || event.decision.wouldBlock) {
        meter.createCounter("dhal.blocked_requests.total").add(1, attributes);
      }
      meter.createHistogram("dhal.inspection.duration_ms").record(event.durationMs, attributes);
    }).catch(() => {
    });
  }
  loadApi() {
    this.apiPromise ??= import("@opentelemetry/api").catch(() => void 0);
    return this.apiPromise;
  }
};
function toAttributes(event, serviceName) {
  return {
    "service.name": serviceName,
    "http.request.method": event.request.method,
    "url.path": event.request.path,
    "dhal.event_id": event.eventId,
    "dhal.correlation_id": event.correlationId ?? "none",
    "dhal.action": event.decision.action,
    "dhal.would_block": Boolean(event.decision.wouldBlock),
    "dhal.rule_id": event.decision.ruleId ?? "none",
    "dhal.rule_category": event.ruleCategory,
    "dhal.threat_kind": event.threatKind ?? "none",
    "dhal.severity": event.severity,
    "dhal.suppressed": event.decision.meta?.suppressed === true,
    "dhal.reason": event.decision.reason,
    "dhal.score": event.decision.score,
    "dhal.route": event.request.route ?? event.request.path,
    "dhal.duration_ms": event.durationMs
  };
}

// src/telemetry/webhook.ts
var import_node_crypto = require("crypto");
var WebhookDhalTelemetry = class {
  constructor(config, options = {}) {
    this.config = config;
    this.maxPending = positiveInteger(options.maxPending, 1e3, "maxPending");
    this.defaultFlushTimeoutMs = positiveInteger(options.defaultFlushTimeoutMs, 5e3, "defaultFlushTimeoutMs");
  }
  config;
  pending = /* @__PURE__ */ new Set();
  maxPending;
  defaultFlushTimeoutMs;
  delivered = 0;
  failed = 0;
  dropped = 0;
  closed = false;
  recordDecision(event) {
    if (!this.config.emitAllowedRequests && event.decision.action === "allow" && !event.decision.wouldBlock) {
      return;
    }
    if (!this.config.enabled || this.config.urls.length === 0) return;
    for (const url of this.config.urls) {
      if (this.closed || this.pending.size >= this.maxPending) {
        this.dropped += 1;
        continue;
      }
      let task;
      task = this.send(url, event).then(() => {
        this.delivered += 1;
      }).catch(() => {
        this.failed += 1;
      }).finally(() => {
        this.pending.delete(task);
      });
      this.pending.add(task);
    }
  }
  async flush(timeoutMs = this.defaultFlushTimeoutMs) {
    const deadline = Date.now() + positiveInteger(timeoutMs, this.defaultFlushTimeoutMs, "timeoutMs");
    while (this.pending.size > 0) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new Error(`Timed out while draining ${this.pending.size} pending Dhal webhook request(s).`);
      }
      const drain = Promise.allSettled([...this.pending]);
      await withTimeout(drain, remainingMs, () => new Error(`Timed out while draining ${this.pending.size} pending Dhal webhook request(s).`));
    }
  }
  async close(timeoutMs = this.defaultFlushTimeoutMs) {
    this.closed = true;
    await this.flush(timeoutMs);
  }
  getHealth() {
    return {
      pending: this.pending.size,
      delivered: this.delivered,
      failed: this.failed,
      dropped: this.dropped,
      closed: this.closed
    };
  }
  async send(url, event) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    timeout.unref?.();
    const payload = { type: "dhal.security_event", ...event };
    const body = JSON.stringify(payload);
    const headers = {
      "content-type": "application/json",
      "user-agent": `dhal-webhook/${DHAL_PACKAGE_VERSION}`
    };
    addSignatureHeaders(headers, body, event.eventId, this.config.signing);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Dhal webhook endpoint returned HTTP ${response.status}.`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
};
function addSignatureHeaders(headers, body, eventId, signing) {
  if (!signing.enabled) return;
  const secret = process.env[signing.secretEnv];
  if (!secret) return;
  const timestamp = String(Math.floor(Date.now() / 1e3));
  const id = eventId || (0, import_node_crypto.randomUUID)();
  const signedPayload = `${timestamp}.${id}.${body}`;
  const digest = (0, import_node_crypto.createHmac)("sha256", secret).update(signedPayload).digest("hex");
  headers[signing.timestampHeader] = timestamp;
  headers[signing.idHeader] = id;
  headers[signing.signatureHeader] = `v1=${digest}`;
}
function positiveInteger(value, fallback, name) {
  if (value === void 0) return fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be an integer >= 1.`);
  return value;
}
async function withTimeout(promise, timeoutMs, createError) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timeout = setTimeout(() => reject(createError()), timeoutMs);
        timeout.unref?.();
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

// src/utils/identity.ts
function extractIdentity(headers, config, existing = {}) {
  return {
    userId: existing.userId ?? firstConfiguredHeader(headers, config.identity.headers.userId),
    tenantId: existing.tenantId ?? firstConfiguredHeader(headers, config.identity.headers.tenantId),
    apiKeyId: existing.apiKeyId ?? firstConfiguredHeader(headers, config.identity.headers.apiKeyId)
  };
}
function firstConfiguredHeader(headers, names) {
  for (const name of names) {
    const value = getHeader(headers, name);
    if (value && value.trim().length > 0) return value.trim();
  }
  return void 0;
}

// src/engine.ts
function createDhal(options = {}) {
  const config = loadDhalConfig(options.configPath, options.config);
  const logger = options.logger ?? console;
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const counters = {
    inspected: 0,
    allowed: 0,
    blocked: 0,
    wouldBlock: 0,
    internalErrors: 0,
    overBudget: 0,
    eventListenerErrors: 0,
    telemetryErrors: 0
  };
  const events = new DhalEventBus(({ eventName, error }) => {
    counters.eventListenerErrors += 1;
    logger.warn(`[dhal] application listener for ${eventName} failed: ${error instanceof Error ? error.message : String(error)}`);
  });
  const rateLimitStore = options.rateLimitStore ?? new MemoryRateLimitStore();
  const signalStore = options.signalStore ?? new MemorySignalStore();
  const ipReputationProvider = options.ipReputationProvider ?? createAbuseIpDbProviderFromConfig(config);
  const telemetry = options.telemetry ?? createTelemetry(config);
  const ipReputationCache = new IpReputationCache();
  let closed = false;
  let closePromise;
  validateRuntimeDependencies(config, options, ipReputationProvider, logger);
  async function inspect(req) {
    assertOpen();
    counters.inspected += 1;
    const started = import_node_perf_hooks.performance.now();
    const normalizedReq = normalizeRequest(req, config);
    const context = createRouteSecurityContext(config, normalizedReq.route ?? normalizedReq.path);
    const effectiveConfig = context.config;
    const ipReputation = createIpReputationEvaluator({
      config: effectiveConfig,
      provider: ipReputationProvider,
      cache: ipReputationCache,
      logger
    });
    let decision;
    try {
      decision = await evaluate(normalizedReq, effectiveConfig, rateLimitStore, signalStore, ipReputation);
    } catch (error) {
      counters.internalErrors += 1;
      const shouldBlock = effectiveConfig.runtime.onInternalError === "block" || effectiveConfig.mode === "strict";
      decision = {
        action: shouldBlock ? "block" : "allow",
        statusCode: shouldBlock ? effectiveConfig.runtime.internalErrorStatusCode : 200,
        reason: "Dhal internal rule evaluation error",
        ruleId: "dhal.internal_error",
        score: shouldBlock ? 100 : 0,
        meta: {
          error: error instanceof Error ? error.message : String(error),
          failBehavior: shouldBlock ? "closed" : "open"
        }
      };
    }
    const durationMs = import_node_perf_hooks.performance.now() - started;
    if (effectiveConfig.runtime.maxInspectionMs > 0 && durationMs > effectiveConfig.runtime.maxInspectionMs) {
      counters.overBudget += 1;
      decision = {
        ...decision,
        meta: {
          ...decision.meta,
          inspectionOverBudget: true,
          inspectionDurationMs: durationMs,
          inspectionBudgetMs: effectiveConfig.runtime.maxInspectionMs
        }
      };
    }
    decision = enrichDecision(decision, effectiveConfig, context.routePattern, context.routeProfile);
    const ruleCategory = deriveRuleCategory(decision.ruleId);
    const policyDecision = applyPolicyToDecision(decision, {
      req: normalizedReq,
      config: effectiveConfig,
      routePattern: context.routePattern,
      routeProfile: context.routeProfile,
      ruleCategory
    });
    const emitted = applyMode(policyDecision, effectiveConfig);
    updateDecisionCounters(counters, emitted);
    const event = buildEvent(normalizedReq, emitted, durationMs, effectiveConfig);
    const shouldEmit = shouldEmitSecurityEvent(event, effectiveConfig);
    if (effectiveConfig.observability.events.enabled && shouldEmit) {
      events.emitDecision(event);
    }
    if (shouldEmit) {
      try {
        telemetry?.recordDecision(event);
      } catch (error) {
        counters.telemetryErrors += 1;
        logger.warn(`[dhal] telemetry adapter failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (effectiveConfig.observability.logs.enabled && shouldEmit && (emitted.action === "block" || emitted.wouldBlock)) {
      writeLog(logger, effectiveConfig, event);
    }
    return emitted;
  }
  async function recordOutcome(req, outcome) {
    assertOpen();
    try {
      const normalizedReq = normalizeRequest(req, config);
      const context = createRouteSecurityContext(config, normalizedReq.route ?? normalizedReq.path);
      const signal = await recordCredentialOutcome({
        req: normalizedReq,
        config: context.config,
        store: signalStore,
        outcome
      });
      if (signal && context.config.observability.events.enabled) {
        events.emitSignal(signal);
      }
    } catch (error) {
      logger.warn(`[dhal] failed to record response outcome: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async function flush(timeoutMs) {
    await flushDhalTelemetry(telemetry, timeoutMs);
  }
  async function close(timeoutMs) {
    if (closePromise) return closePromise;
    closed = true;
    closePromise = (async () => {
      try {
        await closeDhalTelemetry(telemetry, timeoutMs);
      } finally {
        events.removeAllListeners();
      }
    })();
    return closePromise;
  }
  function getRuntimeSnapshot() {
    return {
      startedAt,
      closed,
      ...counters,
      telemetry: getDhalTelemetryHealth(telemetry)
    };
  }
  function assertOpen() {
    if (closed) throw new Error("Dhal engine is closed.");
  }
  return {
    config,
    events,
    inspect,
    recordOutcome,
    flush,
    close,
    getRuntimeSnapshot
  };
}
async function evaluate(req, config, rateLimitStore, signalStore, ipReputation) {
  if (config.mode === "off") return allow("Dhal disabled");
  if (isRuntimeBypassed(req, config)) {
    return {
      ...allow("Request bypassed by Dhal runtime policy"),
      ruleId: "runtime.bypass",
      meta: { bypassed: true }
    };
  }
  const ipDecision = evaluateIpRules(req, config);
  if (ipDecision?.action === "allow") return ipDecision;
  if (ipDecision?.action === "block") return ipDecision;
  const honeypotDecision = evaluateHoneypotRule(req, config);
  if (honeypotDecision) return honeypotDecision;
  const headerDecision = evaluateHeaderRules(req, config);
  if (headerDecision) return headerDecision;
  const contentTypeDecision = evaluateContentTypeRule(req, config);
  if (contentTypeDecision) return contentTypeDecision;
  const apiDecision = evaluateApiPositiveSecurityRule(req, config);
  if (apiDecision) return apiDecision;
  const reputationDecision = await ipReputation.evaluate(req);
  if (reputationDecision) return reputationDecision;
  const credentialDecision = await evaluateCredentialStuffingRule({ req, config, store: signalStore });
  if (credentialDecision) return credentialDecision;
  const rateLimitDecision = await evaluateRateLimitRule({ req, config, store: rateLimitStore });
  if (rateLimitDecision) return rateLimitDecision;
  const signatureDecision = evaluateSignatureRules(req, config);
  if (signatureDecision) return signatureDecision;
  const botDecision = evaluateBotRule(req, config);
  if (botDecision) return botDecision;
  return allow("Request allowed");
}
function normalizeRequest(req, config) {
  return {
    ...req,
    correlationId: req.correlationId ?? extractCorrelationId(req, config),
    ...extractIdentity(req.headers, config, {
      userId: req.userId,
      tenantId: req.tenantId,
      apiKeyId: req.apiKeyId
    })
  };
}
function createTelemetry(config) {
  const delegates = [];
  if (config.observability.otel.enabled) {
    delegates.push(new OpenTelemetryDhalTelemetry({
      serviceName: config.observability.otel.serviceName,
      emitAllowedRequests: config.observability.otel.emitAllowedRequests
    }));
  }
  if (config.observability.webhooks.enabled) {
    delegates.push(new WebhookDhalTelemetry(config.observability.webhooks));
  }
  if (delegates.length === 0) return void 0;
  if (delegates.length === 1) return delegates[0];
  return new CompositeDhalTelemetry(delegates);
}
function validateRuntimeDependencies(config, options, ipReputationProvider, logger) {
  const enforcing = hasEnforcingMode(config);
  const distributedRateLimitEnabled = config.rateLimit.store === "redis" && (config.rateLimit.enabled || Object.values(config.routes).some((profile) => profile.rateLimit?.enabled === true));
  if (distributedRateLimitEnabled && !options.rateLimitStore) {
    const message = "[dhal] rateLimit.store is redis, but no distributed rateLimitStore was provided.";
    if (enforcing) throw new Error(`${message} Refusing to start in an enforcing mode with an in-memory fallback.`);
    logger.warn(`${message} Monitor-only operation will use the in-memory store.`);
  }
  const blockingReputationEnabled = config.ip.reputation.enabled && config.ip.reputation.mode === "blocking" || Object.values(config.routes).some((profile) => profile.ipReputation?.enabled === true && profile.ipReputation.mode === "blocking");
  if (blockingReputationEnabled && !ipReputationProvider) {
    const message = `[dhal] blocking IP reputation is enabled, but no provider is configured. Set ${config.ip.reputation.apiKeyEnv} or pass ipReputationProvider.`;
    if (enforcing) throw new Error(`${message} Refusing to start with an unavailable blocking control.`);
    logger.warn(message);
  } else if (config.ip.reputation.enabled && !ipReputationProvider) {
    logger.warn(`[dhal] IP reputation is enabled, but no provider is configured. Set ${config.ip.reputation.apiKeyEnv} or pass ipReputationProvider.`);
  }
}
function hasEnforcingMode(config) {
  if (config.mode === "block" || config.mode === "strict") return true;
  return Object.values(config.routes).some((profile) => profile.mode === "block" || profile.mode === "strict");
}
function updateDecisionCounters(counters, decision) {
  if (decision.wouldBlock) counters.wouldBlock += 1;
  if (decision.action === "block") counters.blocked += 1;
  else counters.allowed += 1;
}
function enrichDecision(decision, config, routePattern, routeProfile) {
  return {
    ...decision,
    statusCode: decision.action === "block" && decision.statusCode === config.response.blockStatusCode ? config.response.blockStatusCode : decision.statusCode,
    meta: {
      ...decision.meta,
      routePattern: decision.meta?.routePattern ?? routePattern,
      routeProfileTags: routeProfile?.tags,
      responseMessage: config.response.message
    }
  };
}
function applyMode(decision, config) {
  if (config.mode === "monitor" && decision.action === "block") {
    return {
      ...decision,
      action: "allow",
      statusCode: 200,
      wouldBlock: true
    };
  }
  return decision;
}
function allow(reason) {
  return {
    action: "allow",
    statusCode: 200,
    reason,
    score: 0
  };
}
function buildEvent(req, decision, durationMs, config) {
  const ruleCategory = deriveRuleCategory(decision.ruleId);
  const threatKind = typeof decision.meta?.threatKind === "string" ? decision.meta.threatKind : ruleCategory === "signature" || ruleCategory === "ip" || ruleCategory === "rate_limit" ? ruleCategory : void 0;
  const safeRequest = redactRequestForObservability(req, config);
  const baseEvent = {
    eventId: (0, import_node_crypto2.randomUUID)(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    correlationId: req.correlationId ?? extractCorrelationId(req, config),
    request: safeRequest,
    decision,
    ruleCategory,
    threatKind,
    severity: decision.severity ?? config.policy.severity.default,
    durationMs
  };
  return {
    ...baseEvent,
    audit: config.policy.audit.enabled && (config.policy.audit.includeSuppressed || baseEvent.decision.meta?.suppressed !== true) ? buildAuditExplanation(baseEvent) : void 0
  };
}
function isRuntimeBypassed(req, config) {
  if (!config.runtime.bypass.enabled) return false;
  const method = req.method.toUpperCase();
  if (config.runtime.bypass.methods.includes(method)) return true;
  return config.runtime.bypass.paths.some((pattern) => matchesRuntimeBypassPath(req.path, pattern));
}
function matchesRuntimeBypassPath(path, pattern) {
  if (pattern.endsWith("*")) return path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}
function redactRequestForObservability(req, config) {
  const redaction = config.observability.redaction;
  if (!redaction.enabled) {
    return {
      method: req.method,
      path: req.path,
      ip: req.ip,
      route: req.route,
      userId: req.userId,
      tenantId: req.tenantId,
      apiKeyId: req.apiKeyId,
      userAgent: getHeader(req.headers, "user-agent")
    };
  }
  return {
    method: req.method,
    path: req.path,
    ip: redactValue(req.ip, redaction.ip, "ip"),
    route: req.route,
    userId: redactValue(req.userId, redaction.identity, "id"),
    tenantId: redactValue(req.tenantId, redaction.identity, "id"),
    apiKeyId: redactValue(req.apiKeyId, redaction.identity, "id"),
    userAgent: redaction.userAgent === "omit" ? void 0 : getHeader(req.headers, "user-agent")
  };
}
function redactValue(value, mode, kind) {
  if (value === void 0) return void 0;
  if (mode === "none") return value;
  if (mode === "omit") return void 0;
  if (mode === "hash") return `sha256:${(0, import_node_crypto2.createHash)("sha256").update(value).digest("hex").slice(0, 16)}`;
  return kind === "ip" ? maskIp(value) : `${value.slice(0, 3)}\u2026`;
}
function maskIp(ip) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    return ip.replace(/\.\d+$/, ".0");
  }
  if (ip.includes(":")) {
    const groups = ip.split(":");
    return `${groups.slice(0, 3).join(":")}:\u2026`;
  }
  return "masked";
}
function deriveRuleCategory(ruleId) {
  if (!ruleId) return "none";
  if (ruleId.startsWith("rate_limit.")) return "rate_limit";
  if (ruleId.startsWith("signature.")) return "signature";
  if (ruleId.startsWith("ip.")) return "ip";
  if (ruleId.startsWith("request.")) return "request";
  if (ruleId.startsWith("bot.")) return "bot";
  if (ruleId.startsWith("header.")) return "header";
  if (ruleId.startsWith("api.")) return "api";
  if (ruleId.startsWith("content_type.")) return "content_type";
  if (ruleId.startsWith("honeypot.")) return "honeypot";
  if (ruleId.startsWith("credential_stuffing.")) return "credential_stuffing";
  return ruleId.split(".")[0] ?? "unknown";
}
function extractCorrelationId(req, config) {
  for (const header of config.observability.correlation.headers) {
    const value = getHeader(req.headers, header);
    if (value) return value;
  }
  return void 0;
}
function writeLog(logger, config, event) {
  if (config.observability.logs.format === "pretty") {
    logger.warn(
      `[dhal] ${event.decision.wouldBlock ? "would-block" : event.decision.action} ${event.request.method} ${event.request.path} ip=${event.request.ip} route=${String(event.decision.meta?.routePattern ?? event.request.route ?? event.request.path)} rule=${event.decision.ruleId ?? "none"} reason="${event.decision.reason}" event=${event.eventId}`
    );
    return;
  }
  logger.warn(JSON.stringify({ type: "dhal.security_event", ...event }));
}

// src/adapters/fastify.ts
var normalizedRequestSymbol = /* @__PURE__ */ Symbol("dhal.normalizedRequest");
var skipOverrideSymbol = /* @__PURE__ */ Symbol.for("skip-override");
var displayNameSymbol = /* @__PURE__ */ Symbol.for("fastify.display-name");
function dhalFastify(options) {
  const engine = createDhal(options);
  return dhalFastifyFromEngine(engine);
}
function dhalFastifyFromEngine(engine) {
  const plugin = async function dhalFastifyPlugin(fastify) {
    fastify.addHook("preHandler", async (request, reply) => {
      const typedRequest = request;
      const normalized = normalizeFastifyRequest(typedRequest, engine);
      typedRequest[normalizedRequestSymbol] = normalized;
      const decision = await engine.inspect(normalized);
      if (decision.action === "block") {
        if (!reply.sent) {
          reply.code(decision.statusCode).header("x-dhal-action", "block").header("x-dhal-rule", decision.ruleId ?? "unknown").send({
            error: responseMessage(decision) ?? engine.config.response.message,
            reason: decision.reason,
            ruleId: decision.ruleId
          });
        }
      }
    });
    fastify.addHook("onResponse", async (request, reply) => {
      const normalized = request[normalizedRequestSymbol];
      if (normalized) {
        await engine.recordOutcome(normalized, { statusCode: reply.statusCode });
      }
    });
  };
  Object.defineProperty(plugin, skipOverrideSymbol, { value: true });
  Object.defineProperty(plugin, displayNameSymbol, { value: "dhal" });
  return plugin;
}
function normalizeFastifyRequest(req, engine) {
  const headers = lowerCaseHeaders(req.headers);
  const path = safePathname(req.url);
  const identity = extractIdentity(headers, engine.config, {
    userId: req.userId ?? req.user?.id,
    tenantId: req.tenantId,
    apiKeyId: req.apiKeyId
  });
  return {
    method: req.method,
    url: req.url,
    path,
    headers,
    ip: extractClientIp({
      socketIp: req.raw.socket.remoteAddress ?? req.ip,
      headers,
      trustProxy: engine.config.trustProxy
    }),
    route: req.routeOptions?.url ?? req.routerPath ?? path,
    body: req.body,
    rawBody: req.rawBody,
    ...identity
  };
}
function safePathname(url) {
  try {
    return new URL(url, "http://dhal.local").pathname;
  } catch {
    return url.split("?")[0] || "/";
  }
}
function lowerCaseHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}
function responseMessage(decision) {
  return typeof decision.meta?.responseMessage === "string" ? decision.meta.responseMessage : void 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dhalFastify,
  dhalFastifyFromEngine
});
