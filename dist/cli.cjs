#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/cli.ts
var import_node_fs8 = require("fs");
var import_node_path8 = require("path");

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
  const output2 = {};
  for (const obj of objects) {
    for (const [key, value2] of Object.entries(obj ?? {})) {
      const current = output2[key];
      if (Array.isArray(value2)) {
        output2[key] = value2;
      } else if (isPlainObject(value2) && isPlainObject(current)) {
        output2[key] = deepMerge(current, value2);
      } else if (isPlainObject(value2)) {
        output2[key] = deepMerge({}, value2);
      } else if (value2 !== void 0) {
        output2[key] = value2;
      }
    }
  }
  return output2;
}
function isPlainObject(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
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
    for (const value2 of values) {
      if (typeof value2 !== "string" || value2.trim().length === 0) {
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

// src/ci.ts
function evaluateDhalCiPolicy(config) {
  const findings = [];
  if (config.policy.ci.failOnModes.includes(config.mode)) {
    findings.push({
      level: "error",
      code: "mode.disallowed",
      message: `Global mode '${config.mode}' is disallowed by policy.ci.failOnModes.`
    });
  }
  if (config.observability.webhooks.enabled && config.policy.ci.requireWebhookSigning && !config.observability.webhooks.signing.enabled) {
    findings.push({
      level: "error",
      code: "webhooks.unsigned",
      message: "Webhook alerts are enabled but HMAC signing is disabled."
    });
  }
  if (config.policy.ci.disallowExpiredSuppressions) {
    const now = Date.now();
    for (const suppression of config.policy.suppressions) {
      if (suppression.expiresAt && Date.parse(suppression.expiresAt) < now) {
        findings.push({
          level: "error",
          code: "suppression.expired",
          message: `Suppression '${suppression.id}' expired at ${suppression.expiresAt}.`
        });
      }
    }
  }
  for (const suppression of config.policy.suppressions) {
    if (suppression.enabled && !suppression.expiresAt) {
      findings.push({
        level: "warning",
        code: "suppression.no_expiry",
        message: `Suppression '${suppression.id}' has no expiresAt. Prefer time-bounded suppressions.`
      });
    }
  }
  for (const ruleName of config.policy.ci.requireNonMonitorRouteForRules) {
    if (!isRuleEnabled(ruleName, config)) continue;
    const hasProtectiveRoute = Object.values(config.routes).some((profile) => profile.enabled !== false && (profile.mode === "block" || profile.mode === "strict"));
    if (!hasProtectiveRoute && config.mode !== "block" && config.mode !== "strict") {
      findings.push({
        level: "error",
        code: "route.no_enforced_profile",
        message: `Rule '${ruleName}' is enabled, but no global or route profile is in block/strict mode.`
      });
    }
  }
  if (!config.observability.redaction.enabled) {
    findings.push({
      level: "warning",
      code: "observability.redaction_disabled",
      message: "Observability redaction is disabled; logs/events may include raw IPs or identity keys."
    });
  }
  if (config.runtime.onInternalError === "block" && config.mode !== "strict") {
    findings.push({
      level: "warning",
      code: "runtime.fail_closed",
      message: "runtime.onInternalError is block. Validate this carefully to avoid availability incidents."
    });
  }
  if (config.ip.reputation.enabled && config.ip.reputation.mode === "blocking" && config.ip.reputation.timeoutMs > 1e3) {
    findings.push({
      level: "warning",
      code: "reputation.high_timeout",
      message: "Blocking IP reputation timeout is above 1000ms; this can add request latency."
    });
  }
  return {
    ok: findings.every((finding) => finding.level !== "error"),
    findings
  };
}
function isRuleEnabled(ruleName, config) {
  switch (ruleName) {
    case "credentialStuffing":
      return config.rules.credentialStuffing.enabled;
    case "bot":
      return config.rules.bot.enabled;
    case "honeypot":
      return config.rules.honeypot.enabled;
    case "sqli":
      return config.rules.sqli;
    case "xss":
      return config.rules.xss;
    case "pathTraversal":
      return config.rules.pathTraversal;
    case "badUserAgents":
      return config.rules.badUserAgents;
    default:
      return false;
  }
}

// src/config-schema.ts
function getDhalConfigJsonSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://dhal.dev/schemas/v1/dhal.schema.json",
    title: "Dhal configuration (schemaVersion 1, stable v1)",
    type: "object",
    additionalProperties: false,
    properties: {
      schemaVersion: { const: "1", description: "Stable Dhal v1 configuration contract version." },
      mode: { $ref: "#/$defs/mode" },
      trustProxy: { type: "boolean" },
      runtime: { $ref: "#/$defs/runtime" },
      identity: { type: "object" },
      ip: { type: "object" },
      rateLimit: { type: "object" },
      rules: { $ref: "#/$defs/rules" },
      routes: {
        type: "object",
        additionalProperties: { $ref: "#/$defs/routeProfile" }
      },
      policy: { $ref: "#/$defs/policy" },
      observability: { type: "object", properties: { redaction: { $ref: "#/$defs/redaction" } }, additionalProperties: true },
      response: { type: "object" }
    },
    $defs: {
      mode: { enum: ["off", "monitor", "block", "strict"] },
      severity: { enum: ["info", "low", "medium", "high", "critical"] },
      rulePack: { enum: ["generic-web", "api", "auth", "wordpress", "strict-api"] },
      runtime: {
        type: "object",
        additionalProperties: false,
        properties: {
          onInternalError: { enum: ["allow", "block"] },
          internalErrorStatusCode: { type: "integer", minimum: 500, maximum: 599 },
          maxInspectionMs: { type: "number", minimum: 0 },
          bypass: {
            type: "object",
            additionalProperties: false,
            properties: {
              enabled: { type: "boolean" },
              paths: { type: "array", items: { type: "string" } },
              methods: { type: "array", items: { type: "string" } }
            }
          }
        }
      },
      redaction: {
        type: "object",
        additionalProperties: false,
        properties: {
          enabled: { type: "boolean" },
          ip: { enum: ["none", "mask", "hash", "omit"] },
          identity: { enum: ["none", "mask", "hash", "omit"] },
          userAgent: { enum: ["full", "omit"] }
        }
      },
      rateLimit: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          windowSeconds: { type: "integer", minimum: 1 },
          max: { type: "integer", minimum: 1 },
          keyBy: {
            type: "array",
            items: { enum: ["ip", "route", "userId", "tenantId", "apiKeyId"] }
          }
        },
        additionalProperties: false
      },
      rules: {
        type: "object",
        additionalProperties: true,
        properties: {
          packs: { type: "array", items: { $ref: "#/$defs/rulePack" } },
          sqli: { type: "boolean" },
          xss: { type: "boolean" },
          pathTraversal: { type: "boolean" },
          badUserAgents: { type: "boolean" },
          largePayload: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              maxBytes: { type: "integer", minimum: 1 }
            },
            additionalProperties: false
          },
          api: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              requireJsonContentType: { type: "boolean" },
              allowedContentTypes: { type: "array", items: { type: "string" } },
              methodsWithBody: { type: "array", items: { type: "string" } },
              maxJsonDepth: { type: "integer", minimum: 1 },
              maxJsonKeys: { type: "integer", minimum: 1 }
            },
            additionalProperties: false
          },
          headers: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              requireHostHeader: { type: "boolean" },
              maxHeaderCount: { type: "integer", minimum: 1 },
              maxHeaderBytes: { type: "integer", minimum: 1 },
              suspiciousHeaders: { type: "array", items: { type: "string" } },
              blockConflictingForwardingHeaders: { type: "boolean" }
            },
            additionalProperties: false
          },
          contentType: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              blockMissingOnBodyMethods: { type: "boolean" },
              blockJsonMismatch: { type: "boolean" },
              allowedJsonMimeTypes: { type: "array", items: { type: "string" } }
            },
            additionalProperties: false
          }
        }
      },
      routeProfile: {
        type: "object",
        additionalProperties: true,
        properties: {
          enabled: { type: "boolean" },
          mode: { $ref: "#/$defs/mode" },
          tags: { type: "array", items: { type: "string" } },
          rules: { $ref: "#/$defs/rules" },
          rateLimit: { $ref: "#/$defs/rateLimit" },
          ipReputation: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              minScore: { type: "integer", minimum: 0, maximum: 100 },
              mode: { enum: ["async", "blocking"] }
            },
            additionalProperties: false
          },
          response: {
            type: "object",
            properties: {
              blockStatusCode: { type: "integer", minimum: 400, maximum: 599 },
              message: { type: "string" }
            },
            additionalProperties: false
          }
        }
      },
      suppression: {
        type: "object",
        additionalProperties: false,
        required: ["id", "enabled", "reason"],
        properties: {
          id: { type: "string", minLength: 1 },
          enabled: { type: "boolean" },
          reason: { type: "string", minLength: 1 },
          ruleId: { type: "string" },
          ruleCategory: { type: "string" },
          route: { type: "string" },
          path: { type: "string" },
          ip: { type: "string" },
          userId: { type: "string" },
          tenantId: { type: "string" },
          apiKeyId: { type: "string" },
          expiresAt: { type: "string", format: "date-time" }
        }
      },
      policy: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: {
            type: "object",
            additionalProperties: false,
            properties: {
              default: { $ref: "#/$defs/severity" },
              categories: { type: "object", additionalProperties: { $ref: "#/$defs/severity" } },
              rules: { type: "object", additionalProperties: { $ref: "#/$defs/severity" } }
            }
          },
          suppressions: { type: "array", items: { $ref: "#/$defs/suppression" } },
          sampling: {
            type: "object",
            additionalProperties: false,
            properties: {
              enabled: { type: "boolean" },
              rate: { type: "number", minimum: 0, maximum: 1 },
              includeBlocked: { type: "boolean" },
              includeWouldBlock: { type: "boolean" },
              rules: { type: "object", additionalProperties: { type: "number", minimum: 0, maximum: 1 } },
              routes: { type: "object", additionalProperties: { type: "number", minimum: 0, maximum: 1 } }
            }
          },
          audit: {
            type: "object",
            additionalProperties: false,
            properties: {
              enabled: { type: "boolean" },
              includeSuppressed: { type: "boolean" }
            }
          },
          ci: {
            type: "object",
            additionalProperties: false,
            properties: {
              failOnModes: { type: "array", items: { $ref: "#/$defs/mode" } },
              requireWebhookSigning: { type: "boolean" },
              requireNonMonitorRouteForRules: { type: "array", items: { type: "string" } },
              disallowExpiredSuppressions: { type: "boolean" }
            }
          }
        }
      }
    }
  };
}

// src/engine.ts
var import_node_crypto2 = require("crypto");
var import_node_perf_hooks = require("perf_hooks");

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
function escapeRegex(value2) {
  return value2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
function stableSample(value2, rate) {
  let hash = 2166136261;
  for (let index = 0; index < value2.length; index += 1) {
    hash ^= value2.charCodeAt(index);
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
function parseIpv6Groups(value2) {
  if (!value2) return [];
  const groups = value2.split(":");
  const output2 = [];
  for (const group of groups) {
    if (group.includes(".")) {
      const ipv4 = ipv4ToBigInt(group);
      if (ipv4 === null) return null;
      output2.push(Number(ipv4 >> 16n & 0xffffn), Number(ipv4 & 0xffffn));
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    output2.push(Number.parseInt(group, 16));
  }
  return output2;
}
function escapeRegex2(value2) {
  return value2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
function parseJsonOrUndefined(value2) {
  const trimmed = value2.trim();
  if (!trimmed || !/^[\[{]/.test(trimmed)) return void 0;
  try {
    return JSON.parse(trimmed);
  } catch {
    return void 0;
  }
}
function inspectJson(value2, depth = 0) {
  if (Array.isArray(value2)) {
    return value2.reduce((acc, item) => {
      const child = inspectJson(item, depth + 1);
      return { depth: Math.max(acc.depth, child.depth), keys: acc.keys + child.keys };
    }, { depth: depth + 1, keys: 0 });
  }
  if (value2 && typeof value2 === "object") {
    const entries = Object.values(value2);
    return entries.reduce((acc, item) => {
      const child = inspectJson(item, depth + 1);
      return { depth: Math.max(acc.depth, child.depth), keys: acc.keys + child.keys };
    }, { depth: depth + 1, keys: Object.keys(value2).length });
  }
  return { depth, keys: 0 };
}
function normalizeContentType(value2) {
  return value2?.split(";")[0]?.trim().toLowerCase();
}
function matchesMime(value2, patterns) {
  return patterns.some((pattern) => {
    const normalized = pattern.toLowerCase();
    if (normalized.endsWith("/*")) return value2.startsWith(normalized.slice(0, -1));
    return normalized === value2;
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
function looksLikeJson(value2) {
  const trimmed = value2.trim();
  if (!trimmed) return true;
  if (!/^[\[{"0-9tfn-]/i.test(trimmed)) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
function normalizeContentType2(value2) {
  return value2?.split(";")[0]?.trim().toLowerCase();
}
function matchesMime2(value2, patterns) {
  return patterns.some((pattern) => {
    const normalized = pattern.toLowerCase();
    if (normalized.endsWith("/*")) return value2.startsWith(normalized.slice(0, -1));
    return normalized === value2;
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
  const headerBytes = entries.reduce((sum, [name, value2]) => sum + name.length + headerValueBytes(value2), 0);
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
    const value2 = getHeader(req.headers, headerName);
    if (value2) {
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
function headerValueBytes(value2) {
  if (value2 === void 0) return 0;
  if (Array.isArray(value2)) return value2.reduce((sum, item) => sum + item.length, 0);
  return value2.length;
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
  return [raw, decodedOnce, decodedTwice].filter((value2, index, values) => values.indexOf(value2) === index).join("\n");
}
function decodeLoose(value2) {
  try {
    return decodeURIComponent(value2.replace(/\+/g, " "));
  } catch {
    return value2;
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
    const health = this.delegates.map((delegate) => delegate.getHealth?.()).filter((value2) => value2 !== void 0);
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
var DHAL_RELEASE_CHANNEL = "latest";
var DHAL_COMPATIBILITY_MATRIX = {
  packageName: "@rokadhq/dhal",
  version: DHAL_PACKAGE_VERSION,
  releaseChannel: DHAL_RELEASE_CHANNEL,
  node: [
    {
      name: "Node.js",
      range: ">=20.0.0",
      status: "supported",
      notes: "Minimum runtime for the Dhal v1 line."
    },
    {
      name: "Node.js 20",
      range: ">=20.0.0 <22.0.0",
      status: "tested",
      notes: "Compatibility baseline for existing production deployments."
    },
    {
      name: "Node.js 22/24",
      range: ">=22.0.0",
      status: "tested",
      notes: "Primary runtime matrix for v1 verification and release workflows."
    }
  ],
  frameworks: [
    {
      name: "Express",
      range: ">=4.18.0 || >=5.0.0",
      status: "supported",
      notes: "Express 4 and 5 are exercised by the v1 adapter matrix."
    },
    {
      name: "Fastify",
      range: ">=4.0.0 || >=5.0.0",
      status: "supported",
      notes: "Fastify 4 and 5 are exercised by the v1 adapter matrix."
    },
    {
      name: "node:http",
      range: "Node built-in",
      status: "supported",
      notes: "Raw node:http behavior is covered by integration tests."
    },
    {
      name: "NestJS",
      range: "Express/Fastify adapters",
      status: "optional",
      notes: "Integrate through the underlying Express or Fastify adapter."
    }
  ],
  integrations: [
    {
      name: "Redis / Valkey",
      range: "ioredis >=5.0.0 compatible client",
      status: "supported",
      notes: "Redis 7 and Valkey 8 multi-instance contracts are exercised in CI."
    },
    {
      name: "OpenTelemetry API",
      range: ">=1.8.0",
      status: "optional",
      notes: "Use @rokadhq/dhal/telemetry/otel when OTel is configured in the app."
    },
    {
      name: "Signed webhook telemetry",
      range: "HTTP/HTTPS endpoint",
      status: "supported",
      notes: "HMAC signing and current package metadata are integration-tested."
    },
    {
      name: "AbuseIPDB-style reputation",
      range: "API key configured by environment variable",
      status: "optional",
      notes: "Use cache-first behavior and prefer async mode on public APIs."
    },
    {
      name: "AI SDK autosetup",
      range: "ai >=5.0.0 plus optional provider packages",
      status: "experimental",
      notes: "Generates proposed configuration and remains outside the stable v1 contract."
    },
    {
      name: "GitHub Actions publishing",
      range: "npm Trusted Publishing",
      status: "supported",
      notes: "npmjs publishing is primary; GitHub Packages publishing is optional."
    }
  ],
  packageManagers: [
    {
      name: "npm",
      range: ">=10",
      status: "tested",
      notes: "Primary supported package manager and release workflow."
    },
    {
      name: "pnpm / yarn / bun",
      range: "modern versions",
      status: "optional",
      notes: "Expected to work for consumption; release verification uses npm."
    }
  ],
  stability: {
    publicApi: "stable",
    configSchema: "stable",
    cli: "stable",
    note: "Dhal 1.0.0 is the stable v1 contract. Stable exports, CLI commands, and schemaVersion 1 remain backward compatible throughout v1.x."
  }
};
function getDhalCompatibilityMatrix() {
  return DHAL_COMPATIBILITY_MATRIX;
}

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
function positiveInteger(value2, fallback, name) {
  if (value2 === void 0) return fallback;
  if (!Number.isInteger(value2) || value2 < 1) throw new Error(`${name} must be an integer >= 1.`);
  return value2;
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
    const value2 = getHeader(headers, name);
    if (value2 && value2.trim().length > 0) return value2.trim();
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
function redactValue(value2, mode, kind) {
  if (value2 === void 0) return void 0;
  if (mode === "none") return value2;
  if (mode === "omit") return void 0;
  if (mode === "hash") return `sha256:${(0, import_node_crypto2.createHash)("sha256").update(value2).digest("hex").slice(0, 16)}`;
  return kind === "ip" ? maskIp(value2) : `${value2.slice(0, 3)}\u2026`;
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
    const value2 = getHeader(req.headers, header);
    if (value2) return value2;
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

// src/autosetup/index.ts
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");

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
function parseJsonObject(value2) {
  const trimmed = value2.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}
function sanitizeConfigPatch(value2) {
  if (!value2 || typeof value2 !== "object" || Array.isArray(value2)) return {};
  const clone = JSON.parse(JSON.stringify(value2));
  if (clone.ip?.reputation && "apiKey" in clone.ip.reputation) {
    delete clone.ip.reputation.apiKey;
  }
  return clone;
}
function stringArray(value2) {
  return Array.isArray(value2) ? value2.filter((item) => typeof item === "string") : [];
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

// src/doctor.ts
var import_node_fs4 = require("fs");
var import_node_path4 = require("path");

// src/rules/catalog.ts
var DHAL_RULE_CATALOG = [
  {
    id: "ip.allow",
    category: "ip",
    title: "IP allowlist bypass",
    description: "Allows explicitly trusted IP addresses or CIDR ranges before other checks run.",
    defaultSeverity: "info",
    defaultAction: "allow",
    confidence: 0.99,
    enabledByDefault: true,
    configPath: "ip.allow",
    falsePositiveNotes: "Keep this list short and reviewed because allowlisted traffic bypasses later checks."
  },
  {
    id: "ip.block",
    category: "ip",
    title: "IP blocklist",
    description: "Blocks explicitly denied IP addresses or CIDR ranges.",
    defaultSeverity: "high",
    defaultAction: "block",
    confidence: 0.99,
    enabledByDefault: true,
    configPath: "ip.block"
  },
  {
    id: "ip.reputation",
    category: "ip",
    title: "IP reputation",
    description: "Blocks or monitors clients that exceed the configured IP reputation score threshold.",
    defaultSeverity: "high",
    defaultAction: "block",
    confidence: 0.82,
    enabledByDefault: false,
    configPath: "ip.reputation",
    falsePositiveNotes: "Use async mode and cache reputation results before enabling blocking on high-traffic routes."
  },
  {
    id: "rate_limit.exceeded",
    category: "rate_limit",
    title: "Rate limit exceeded",
    description: "Applies token-bucket request limiting by IP, route, user, tenant, or API key identity.",
    defaultSeverity: "medium",
    defaultAction: "block",
    confidence: 0.95,
    enabledByDefault: true,
    configPath: "rateLimit"
  },
  {
    id: "request.large_payload",
    category: "request",
    title: "Large payload",
    description: "Rejects requests whose declared body size exceeds the configured maximum.",
    defaultSeverity: "medium",
    defaultAction: "block",
    confidence: 0.95,
    enabledByDefault: true,
    configPath: "rules.largePayload"
  },
  {
    id: "signature.sqli",
    category: "signature",
    title: "SQL injection signature",
    description: "Detects common SQL injection probes across URL and request body surfaces.",
    defaultSeverity: "high",
    defaultAction: "block",
    confidence: 0.78,
    enabledByDefault: true,
    configPath: "rules.sqli",
    falsePositiveNotes: "Replay suspected false positives from search/query-builder endpoints before strict enforcement."
  },
  {
    id: "signature.xss",
    category: "signature",
    title: "XSS signature",
    description: "Detects common script, event-handler, and javascript: payload probes.",
    defaultSeverity: "high",
    defaultAction: "block",
    confidence: 0.76,
    enabledByDefault: true,
    configPath: "rules.xss"
  },
  {
    id: "signature.path_traversal",
    category: "signature",
    title: "Path traversal signature",
    description: "Detects traversal payloads, encoded traversal, and common sensitive filesystem paths.",
    defaultSeverity: "critical",
    defaultAction: "block",
    confidence: 0.9,
    enabledByDefault: true,
    configPath: "rules.pathTraversal"
  },
  {
    id: "signature.bad_user_agent",
    category: "signature",
    title: "Known scanner user-agent",
    description: "Detects common scanner, mapper, and attack-tool user-agent strings.",
    defaultSeverity: "medium",
    defaultAction: "block",
    confidence: 0.82,
    enabledByDefault: true,
    configPath: "rules.badUserAgents"
  },
  {
    id: "signature.ssrf.metadata",
    category: "signature",
    title: "Cloud metadata SSRF probe",
    description: "Detects attempts to reach cloud instance metadata services through application inputs.",
    defaultSeverity: "high",
    defaultAction: "block",
    confidence: 0.91,
    enabledByDefault: true,
    configPath: "rules.packs",
    packs: ["generic-web", "api", "strict-api"]
  },
  {
    id: "signature.rce.shell",
    category: "signature",
    title: "Shell/RCE probe",
    description: "Detects common shell command injection and remote code execution payloads.",
    defaultSeverity: "high",
    defaultAction: "block",
    confidence: 0.84,
    enabledByDefault: true,
    configPath: "rules.packs",
    packs: ["generic-web", "api", "strict-api"]
  },
  {
    id: "signature.graphql.introspection",
    category: "signature",
    title: "GraphQL introspection probe",
    description: "Detects GraphQL introspection strings that may expose schema details.",
    defaultSeverity: "medium",
    defaultAction: "block",
    confidence: 0.68,
    enabledByDefault: true,
    configPath: "rules.packs",
    packs: ["api", "strict-api"],
    falsePositiveNotes: "GraphQL teams may intentionally allow introspection in development but disable it in production."
  },
  {
    id: "signature.template_injection",
    category: "signature",
    title: "Template injection probe",
    description: "Detects common server-side template injection and expression payloads.",
    defaultSeverity: "high",
    defaultAction: "block",
    confidence: 0.79,
    enabledByDefault: true,
    configPath: "rules.packs",
    packs: ["generic-web", "api", "strict-api"]
  },
  {
    id: "signature.wordpress.probe",
    category: "signature",
    title: "WordPress probe",
    description: "Detects WordPress-specific scans against non-WordPress or protected applications.",
    defaultSeverity: "medium",
    defaultAction: "block",
    confidence: 0.83,
    enabledByDefault: false,
    configPath: "rules.packs",
    packs: ["wordpress"]
  },
  {
    id: "header.anomaly",
    category: "header",
    title: "Header anomaly",
    description: "Detects missing Host headers, too many headers, oversized headers, and suspicious forwarding headers.",
    defaultSeverity: "medium",
    defaultAction: "block",
    confidence: 0.82,
    enabledByDefault: true,
    configPath: "rules.headers"
  },
  {
    id: "api.positive_security_violation",
    category: "api",
    title: "API positive security violation",
    description: "Enforces JSON API expectations such as allowed content types, JSON depth, and JSON key count.",
    defaultSeverity: "medium",
    defaultAction: "block",
    confidence: 0.86,
    enabledByDefault: false,
    configPath: "rules.api",
    falsePositiveNotes: "Enable per API route after confirming expected request formats."
  },
  {
    id: "content_type.mismatch",
    category: "content_type",
    title: "Content-Type/body mismatch",
    description: "Detects JSON-looking bodies sent with non-JSON content types and body methods missing content type.",
    defaultSeverity: "medium",
    defaultAction: "block",
    confidence: 0.8,
    enabledByDefault: true,
    configPath: "rules.contentType"
  },
  {
    id: "bot.suspicious_request",
    category: "bot",
    title: "Suspicious bot request",
    description: "Scores automation and bot signals from user-agent, headers, and browser-header consistency.",
    defaultSeverity: "medium",
    defaultAction: "block",
    confidence: 0.72,
    enabledByDefault: true,
    configPath: "rules.bot",
    falsePositiveNotes: "Tune allowUserAgents, ignorePaths, and minSignals before strict blocking."
  },
  {
    id: "credential_stuffing.threshold_exceeded",
    category: "credential_stuffing",
    title: "Credential-stuffing threshold exceeded",
    description: "Blocks identities that repeatedly fail login routes inside the configured time window.",
    defaultSeverity: "high",
    defaultAction: "block",
    confidence: 0.88,
    enabledByDefault: true,
    configPath: "rules.credentialStuffing"
  },
  {
    id: "honeypot.triggered",
    category: "honeypot",
    title: "Honeypot canary triggered",
    description: "Detects trap paths, headers, and query parameters commonly touched by scanners.",
    defaultSeverity: "critical",
    defaultAction: "block",
    confidence: 0.94,
    enabledByDefault: true,
    configPath: "rules.honeypot"
  }
];
function getDhalRuleCatalog(config) {
  return DHAL_RULE_CATALOG.map((entry) => ({
    ...entry,
    enabled: config ? isCatalogEntryEnabled(entry, config) : entry.enabledByDefault,
    effectiveSeverity: config ? resolveCatalogSeverity(entry, config) : entry.defaultSeverity
  }));
}
function resolveCatalogSeverity(entry, config) {
  return config.policy.severity.rules[entry.id] ?? config.policy.severity.categories[entry.category] ?? entry.defaultSeverity;
}
function isCatalogEntryEnabled(entry, config) {
  if (entry.packs && entry.packs.length > 0) {
    return entry.packs.some((pack) => config.rules.packs.includes(pack));
  }
  switch (entry.id) {
    case "ip.allow":
      return config.ip.allow.length > 0;
    case "ip.block":
      return config.ip.block.length > 0;
    case "ip.reputation":
      return config.ip.reputation.enabled;
    case "rate_limit.exceeded":
      return config.rateLimit.enabled;
    case "request.large_payload":
      return config.rules.largePayload.enabled;
    case "signature.sqli":
      return config.rules.sqli;
    case "signature.xss":
      return config.rules.xss;
    case "signature.path_traversal":
      return config.rules.pathTraversal;
    case "signature.bad_user_agent":
      return config.rules.badUserAgents;
    case "header.anomaly":
      return config.rules.headers.enabled;
    case "api.positive_security_violation":
      return config.rules.api.enabled;
    case "content_type.mismatch":
      return config.rules.contentType.enabled;
    case "bot.suspicious_request":
      return config.rules.bot.enabled;
    case "credential_stuffing.threshold_exceeded":
      return config.rules.credentialStuffing.enabled;
    case "honeypot.triggered":
      return config.rules.honeypot.enabled;
    default:
      return entry.enabledByDefault;
  }
}

// src/doctor.ts
function runDhalDoctor(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? "dhal.json";
  const resolvedConfigPath = (0, import_node_path4.resolve)(cwd, configPath);
  const env = options.env ?? process.env;
  const checks = [];
  const nodeVersion = process.version;
  checkNodeVersion(checks, nodeVersion);
  const configExists = (0, import_node_fs4.existsSync)(resolvedConfigPath);
  if (configExists) {
    checks.push({ level: "ok", code: "config.present", message: `Found ${configPath}.` });
  } else {
    checks.push({
      level: "warning",
      code: "config.missing",
      message: `No ${configPath} found. Dhal will use defaults if loaded from this directory.`,
      hint: "Run `npx dhal init` to create a reviewable config file."
    });
  }
  let config;
  try {
    config = loadDhalConfig(resolvedConfigPath);
    checks.push({ level: "ok", code: "config.valid", message: "Config loads and validates." });
  } catch (error) {
    checks.push({
      level: "error",
      code: "config.invalid",
      message: error instanceof Error ? error.message : String(error),
      hint: "Run `npx dhal test-config` after fixing the config."
    });
    return {
      ok: false,
      packageName: "@rokadhq/dhal",
      cli: "dhal",
      configPath: resolvedConfigPath,
      configExists,
      nodeVersion,
      checks
    };
  }
  if (config.mode === "monitor") {
    checks.push({
      level: "warning",
      code: "mode.monitor",
      message: "Global mode is monitor; Dhal will not actively block unless a route overrides mode.",
      hint: "Start this way intentionally, then move high-confidence routes to block mode."
    });
  } else if (config.mode === "off") {
    checks.push({ level: "error", code: "mode.off", message: "Global mode is off." });
  } else {
    checks.push({ level: "ok", code: "mode.enforcing", message: `Global mode is ${config.mode}.` });
  }
  if (config.runtime.onInternalError === "allow") {
    checks.push({
      level: "ok",
      code: "runtime.fail_open",
      message: "Internal Dhal errors fail open by default.",
      hint: "For hardened internal APIs, set runtime.onInternalError to block after validating false-positive behavior."
    });
  } else {
    checks.push({ level: "warning", code: "runtime.fail_closed", message: "Internal Dhal errors are configured to fail closed." });
  }
  if (config.runtime.bypass.enabled) {
    checks.push({ level: "ok", code: "runtime.bypass", message: `Runtime bypass is enabled for ${config.runtime.bypass.paths.length} paths and ${config.runtime.bypass.methods.length} methods.` });
  }
  if (config.observability.redaction.enabled) {
    checks.push({ level: "ok", code: "privacy.redaction", message: `Observability redaction is enabled for ip=${config.observability.redaction.ip}, identity=${config.observability.redaction.identity}.` });
  } else {
    checks.push({
      level: "warning",
      code: "privacy.redaction_disabled",
      message: "Observability redaction is disabled.",
      hint: "Enable observability.redaction before sending logs/events to shared systems."
    });
  }
  if (config.trustProxy) {
    checks.push({ level: "ok", code: "proxy.trusted", message: "trustProxy is enabled for proxy-aware client IP extraction." });
  } else {
    checks.push({
      level: "warning",
      code: "proxy.not_trusted",
      message: "trustProxy is disabled.",
      hint: "Enable only when your app is behind a trusted proxy/CDN that sets forwarding headers correctly."
    });
  }
  if (config.rateLimit.enabled && config.rateLimit.store === "memory") {
    checks.push({
      level: "warning",
      code: "rate_limit.memory_store",
      message: "Rate limiting uses the in-memory store.",
      hint: "Use Redis/Valkey for multi-instance or serverless production deployments."
    });
  }
  if (config.ip.reputation.enabled) {
    const apiKey = env[config.ip.reputation.apiKeyEnv];
    if (!apiKey) {
      checks.push({
        level: config.ip.reputation.mode === "blocking" ? "error" : "warning",
        code: "ip_reputation.missing_key",
        message: `IP reputation is enabled but ${config.ip.reputation.apiKeyEnv} is not set.`,
        hint: "Set the environment variable or disable ip.reputation.enabled."
      });
    } else {
      checks.push({ level: "ok", code: "ip_reputation.key_present", message: `Found ${config.ip.reputation.apiKeyEnv}.` });
    }
  }
  if (config.observability.webhooks.enabled) {
    if (config.observability.webhooks.urls.length === 0) {
      checks.push({ level: "error", code: "webhooks.no_targets", message: "Webhooks are enabled but no URLs are configured." });
    }
    if (!config.observability.webhooks.signing.enabled) {
      checks.push({
        level: "warning",
        code: "webhooks.unsigned",
        message: "Webhook alerts are enabled without HMAC signing.",
        hint: "Enable observability.webhooks.signing before sending alerts to shared infrastructure."
      });
    } else if (!env[config.observability.webhooks.signing.secretEnv]) {
      checks.push({
        level: "error",
        code: "webhooks.missing_secret",
        message: `Webhook signing is enabled but ${config.observability.webhooks.signing.secretEnv} is not set.`
      });
    } else {
      checks.push({ level: "ok", code: "webhooks.signing_ready", message: "Webhook signing secret is present." });
    }
  }
  if (config.observability.otel.enabled) {
    checks.push({ level: "ok", code: "otel.enabled", message: "OpenTelemetry emission is enabled." });
  }
  const ci = evaluateDhalCiPolicy(config);
  for (const finding of ci.findings) {
    checks.push({
      level: finding.level === "error" ? "error" : "warning",
      code: `ci.${finding.code}`,
      message: finding.message
    });
  }
  const enabledRules = getDhalRuleCatalog(config).filter((rule) => rule.enabled).length;
  checks.push({ level: "ok", code: "rules.catalog", message: `${enabledRules} rule catalog entries are enabled by the current config.` });
  return {
    ok: checks.every((check) => check.level !== "error"),
    packageName: "@rokadhq/dhal",
    cli: "dhal",
    configPath: resolvedConfigPath,
    configExists,
    nodeVersion,
    checks,
    summary: {
      mode: config.mode,
      routeProfiles: Object.keys(config.routes).length,
      enabledRules,
      rateLimitStore: config.rateLimit.store,
      webhooksEnabled: config.observability.webhooks.enabled,
      otelEnabled: config.observability.otel.enabled,
      ipReputationEnabled: config.ip.reputation.enabled,
      runtimeBypassEnabled: config.runtime.bypass.enabled,
      onInternalError: config.runtime.onInternalError,
      redactionEnabled: config.observability.redaction.enabled
    },
    ci
  };
}
function checkNodeVersion(checks, nodeVersion) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(nodeVersion);
  if (!match) {
    checks.push({ level: "warning", code: "node.unknown", message: `Could not parse Node version ${nodeVersion}.` });
    return;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const supported = major > 18 || major === 18 && (minor > 18 || minor === 18 && patch >= 0);
  if (supported) {
    checks.push({ level: "ok", code: "node.supported", message: `Node ${nodeVersion} satisfies Dhal's runtime requirement.` });
  } else {
    checks.push({ level: "error", code: "node.unsupported", message: `Node ${nodeVersion} is below Dhal's minimum supported runtime.` });
  }
}

// src/presets.ts
var import_node_fs5 = require("fs");
var import_node_path5 = require("path");
var DHAL_PRESETS = {
  starter: {
    name: "starter",
    title: "Starter monitor-mode policy",
    description: "Safe default policy for first installs. Detects and logs security decisions without blocking by default.",
    intendedFor: ["local setup", "first production dry-run", "new Dhal installations"],
    notes: [
      "Starts in monitor mode so teams can review would-block events before enforcement.",
      "Uses the in-memory rate-limit store; switch to Redis/Valkey for multi-instance production.",
      "Keeps IP reputation, webhooks, and OTel disabled until credentials/endpoints are configured."
    ],
    config: {
      mode: "monitor",
      trustProxy: false,
      rateLimit: {
        enabled: true,
        store: "memory",
        keyBy: ["ip", "route"],
        default: { windowSeconds: 60, max: 120 }
      },
      rules: {
        packs: ["generic-web", "api"],
        api: { enabled: false },
        bot: { enabled: true },
        honeypot: { enabled: true },
        credentialStuffing: { enabled: true }
      }
    }
  },
  "api-production": {
    name: "api-production",
    title: "Production API baseline",
    description: "Production-oriented baseline for JSON APIs running behind a trusted proxy/CDN with Redis/Valkey available.",
    intendedFor: ["REST APIs", "SaaS APIs", "multi-instance Node deployments"],
    notes: [
      "Assumes a trusted proxy/CDN provides forwarding headers; validate your edge before enabling trustProxy.",
      "Uses Redis/Valkey for distributed rate limiting but does not create the Redis client for you.",
      "Keeps global mode monitor while enforcing high-confidence login and private API route profiles."
    ],
    config: {
      mode: "monitor",
      trustProxy: true,
      rateLimit: {
        enabled: true,
        store: "redis",
        keyBy: ["ip", "route"],
        default: { windowSeconds: 60, max: 300 }
      },
      rules: {
        packs: ["generic-web", "api", "auth"],
        api: { enabled: true, requireJsonContentType: true, maxJsonDepth: 24, maxJsonKeys: 800 },
        headers: { enabled: true, blockConflictingForwardingHeaders: true },
        contentType: { enabled: true, blockMissingOnBodyMethods: true, blockJsonMismatch: true },
        bot: {
          enabled: true,
          scoreThreshold: 75,
          falsePositiveControls: {
            minSignals: 2,
            skipStaticAssets: true,
            ignorePaths: ["/healthz", "/health", "/readyz", "/favicon.ico"],
            ignorePrivateIps: true
          }
        },
        credentialStuffing: { enabled: true, maxFailures: 6, windowSeconds: 300, keyBy: ["ip", "route", "userAgent"] }
      },
      routes: {
        "/api/login": {
          mode: "block",
          tags: ["auth", "login"],
          rateLimit: { enabled: true, windowSeconds: 60, max: 10, keyBy: ["ip", "route"] },
          rules: {
            credentialStuffing: { enabled: true, maxFailures: 5, windowSeconds: 300, keyBy: ["ip", "route", "userAgent"] },
            bot: { enabled: true }
          },
          response: { blockStatusCode: 429, message: "Too many login attempts" }
        },
        "/api/private/*": {
          mode: "block",
          tags: ["api", "private"],
          rateLimit: { enabled: true, windowSeconds: 60, max: 120, keyBy: ["tenantId", "apiKeyId", "route"] },
          rules: {
            api: { enabled: true },
            contentType: { enabled: true }
          }
        }
      },
      observability: {
        otel: { enabled: true, serviceName: "dhal-protected-api", emitAllowedRequests: false },
        webhooks: {
          enabled: false,
          signing: { enabled: true, secretEnv: "DHAL_WEBHOOK_SECRET" }
        }
      },
      policy: {
        ci: {
          failOnModes: ["off"],
          requireWebhookSigning: true,
          requireNonMonitorRouteForRules: ["credential_stuffing.threshold_exceeded", "rate_limit.exceeded"],
          disallowExpiredSuppressions: true
        }
      }
    }
  },
  "auth-hardened": {
    name: "auth-hardened",
    title: "Auth and credential-stuffing hardening",
    description: "Route profiles and behavior controls for login, session, and authentication surfaces.",
    intendedFor: ["login APIs", "session endpoints", "password flows", "admin auth"],
    notes: [
      "Blocks high-confidence login abuse while leaving the rest of the app in monitor mode.",
      "Uses response-outcome learning from 401/403/400 responses.",
      "Tune keyBy to match your auth model; API-key and tenant-aware apps should include apiKeyId/tenantId."
    ],
    config: {
      mode: "monitor",
      rules: {
        packs: ["generic-web", "auth"],
        credentialStuffing: {
          enabled: true,
          loginPathPatterns: ["/api/login", "/login", "/auth/login", "/api/auth/*"],
          failureStatusCodes: [400, 401, 403],
          windowSeconds: 300,
          maxFailures: 5,
          keyBy: ["ip", "route", "userAgent"]
        },
        bot: { enabled: true, scoreThreshold: 70 },
        honeypot: { enabled: true }
      },
      routes: {
        "/api/login": {
          mode: "block",
          tags: ["auth", "login"],
          rateLimit: { enabled: true, windowSeconds: 60, max: 8, keyBy: ["ip", "route"] },
          response: { blockStatusCode: 429, message: "Too many login attempts" }
        },
        "/auth/*": {
          mode: "block",
          tags: ["auth"],
          rateLimit: { enabled: true, windowSeconds: 60, max: 30, keyBy: ["ip", "route"] }
        }
      }
    }
  },
  "strict-json-api": {
    name: "strict-json-api",
    title: "Strict JSON API policy",
    description: "Tighter positive-security policy for APIs that should only receive JSON request bodies.",
    intendedFor: ["internal APIs", "machine-to-machine APIs", "strict JSON services"],
    notes: [
      "Enables positive security checks for methods with bodies.",
      "Can create false positives for multipart uploads or form endpoints; add route-specific exceptions before block mode.",
      "Best paired with replay fixtures before broad production enforcement."
    ],
    config: {
      mode: "monitor",
      rules: {
        packs: ["generic-web", "api", "strict-api"],
        api: {
          enabled: true,
          requireJsonContentType: true,
          allowedContentTypes: ["application/json", "application/problem+json", "application/ld+json"],
          methodsWithBody: ["POST", "PUT", "PATCH"],
          maxJsonDepth: 18,
          maxJsonKeys: 500
        },
        contentType: {
          enabled: true,
          blockMissingOnBodyMethods: true,
          blockJsonMismatch: true,
          allowedJsonMimeTypes: ["application/json", "application/problem+json", "application/ld+json"]
        },
        headers: { enabled: true, maxHeaderCount: 80, maxHeaderBytes: 12288 }
      },
      routes: {
        "/api/*": {
          mode: "block",
          tags: ["api", "json"],
          rules: {
            api: { enabled: true },
            contentType: { enabled: true },
            headers: { enabled: true }
          }
        },
        "/api/upload": {
          mode: "monitor",
          tags: ["api", "upload", "review-required"],
          rules: {
            api: { enabled: false },
            contentType: { blockMissingOnBodyMethods: false }
          }
        }
      }
    }
  },
  "behind-proxy": {
    name: "behind-proxy",
    title: "Trusted proxy/CDN deployment",
    description: "Baseline for apps running behind a correctly configured CDN, ingress, reverse proxy, or load balancer.",
    intendedFor: ["Cloudflare", "AWS ALB", "nginx", "Envoy", "Kubernetes ingress"],
    notes: [
      "Only enable trustProxy when all direct origin traffic is blocked or forwarding headers are controlled.",
      "Turns on conflicting forwarding-header detection to reduce spoofing risk.",
      "Keeps enforcement in monitor mode until your deployment topology is verified."
    ],
    config: {
      mode: "monitor",
      trustProxy: true,
      rules: {
        headers: {
          enabled: true,
          requireHostHeader: true,
          maxHeaderCount: 96,
          maxHeaderBytes: 16384,
          blockConflictingForwardingHeaders: true,
          suspiciousHeaders: ["x-forwarded-host", "x-original-url", "x-rewrite-url", "x-real-ip"]
        },
        bot: {
          falsePositiveControls: {
            minSignals: 2,
            skipStaticAssets: true,
            ignorePaths: ["/healthz", "/health", "/readyz", "/favicon.ico"],
            ignorePrivateIps: true
          }
        }
      }
    }
  },
  observability: {
    name: "observability",
    title: "Telemetry and signed alerts",
    description: "Enables OpenTelemetry and signed webhook-ready event settings without changing enforcement mode.",
    intendedFor: ["SIEM pipelines", "incident workflows", "Anubase security dashboards", "OTel collectors"],
    notes: [
      "Webhook targets stay empty by default; add URLs in dhal.json or through deployment templating.",
      "Signing is enabled and expects DHAL_WEBHOOK_SECRET at runtime.",
      "Allowed-request emission remains off to keep telemetry volume controlled."
    ],
    config: {
      observability: {
        logs: { enabled: true, format: "json" },
        events: { enabled: true },
        otel: { enabled: true, serviceName: "dhal-protected-app", emitAllowedRequests: false },
        webhooks: {
          enabled: true,
          urls: [],
          emitAllowedRequests: false,
          signing: {
            enabled: true,
            secretEnv: "DHAL_WEBHOOK_SECRET",
            signatureHeader: "x-dhal-signature",
            timestampHeader: "x-dhal-timestamp",
            idHeader: "x-dhal-event-id"
          }
        }
      }
    }
  }
};
function listDhalPresets() {
  return Object.values(DHAL_PRESETS).map(({ config: _config, ...summary2 }) => summary2);
}
function getDhalPreset(name) {
  if (!isPresetName(name)) {
    throw new Error(`Unknown Dhal preset: ${name}. Run \`dhal presets\` to list available presets.`);
  }
  return DHAL_PRESETS[name];
}
function applyDhalPreset(config, presetName) {
  const preset = getDhalPreset(presetName);
  return deepMerge(defaultConfig, config, preset.config);
}
function readConfigIfExists(configPath = "dhal.json") {
  const resolvedPath = (0, import_node_path5.resolve)(process.cwd(), configPath);
  if (!(0, import_node_fs5.existsSync)(resolvedPath)) return {};
  return JSON.parse((0, import_node_fs5.readFileSync)(resolvedPath, "utf8"));
}
function isPresetName(name) {
  return Object.prototype.hasOwnProperty.call(DHAL_PRESETS, name);
}

// src/readiness.ts
var import_node_fs6 = require("fs");
var import_node_path6 = require("path");
var BASE_SCORE = 100;
function runDhalReadiness(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? "dhal.json";
  const resolvedConfigPath = (0, import_node_path6.resolve)(cwd, configPath);
  const production = Boolean(options.production);
  const minScore = options.minScore ?? (production ? 85 : 70);
  const compatibility = getDhalCompatibilityMatrix();
  const checks = [];
  const configExists = (0, import_node_fs6.existsSync)(resolvedConfigPath);
  if (!configExists) {
    checks.push({
      code: "config.missing",
      level: production ? "fail" : "warn",
      message: `No ${configPath} file found.`,
      hint: "Run `npx dhal init` or `npx dhal presets apply starter --write`.",
      points: production ? -25 : -10
    });
  } else {
    checks.push({ code: "config.present", level: "pass", message: `Found ${configPath}.`, points: 0 });
  }
  let config;
  try {
    config = loadDhalConfig(resolvedConfigPath);
    checks.push({ code: "config.valid", level: "pass", message: "Config loads and validates.", points: 0 });
  } catch (error) {
    checks.push({
      code: "config.invalid",
      level: "fail",
      message: error instanceof Error ? error.message : String(error),
      hint: "Run `npx dhal test-config` and fix validation errors before release.",
      points: -60
    });
    const score2 = clampScore(BASE_SCORE + sumPoints(checks));
    return {
      ok: false,
      packageName: "@rokadhq/dhal",
      version: compatibility.version,
      releaseChannel: compatibility.releaseChannel,
      target: production ? "production" : "development",
      minScore,
      score: score2,
      maxScore: BASE_SCORE,
      configPath: resolvedConfigPath,
      configExists,
      checks
    };
  }
  addModeChecks(config, checks, production);
  addRouteChecks(config, checks, production);
  addStoreChecks(config, checks, production);
  addRuntimeChecks(config, checks, production);
  addObservabilityChecks(config, checks, production, options.env ?? process.env);
  addPolicyChecks(config, checks, production);
  addRulesChecks(config, checks);
  const doctor = runDhalDoctor({ configPath: resolvedConfigPath, env: options.env });
  if (!doctor.ok) {
    checks.push({
      code: "doctor.needs_attention",
      level: "warn",
      message: "Dhal doctor reported errors or warnings that should be reviewed.",
      hint: "Run `npx dhal doctor --json` for the full diagnostic report.",
      points: production ? -10 : -5
    });
  }
  const score = clampScore(BASE_SCORE + sumPoints(checks));
  const hardFailures = checks.some((check) => check.level === "fail");
  const enforcingRoutes = Object.values(config.routes).filter((route) => route.enabled !== false && (route.mode === "block" || route.mode === "strict")).length;
  return {
    ok: !hardFailures && score >= minScore,
    packageName: "@rokadhq/dhal",
    version: compatibility.version,
    releaseChannel: compatibility.releaseChannel,
    target: production ? "production" : "development",
    minScore,
    score,
    maxScore: BASE_SCORE,
    configPath: resolvedConfigPath,
    configExists,
    summary: {
      mode: config.mode,
      routeProfiles: Object.keys(config.routes).length,
      enforcingRoutes,
      enabledRules: getDhalRuleCatalog(config).filter((rule) => rule.enabled).length,
      rateLimitStore: config.rateLimit.store,
      trustProxy: config.trustProxy,
      redactionEnabled: config.observability.redaction.enabled,
      webhooksEnabled: config.observability.webhooks.enabled,
      webhookSigningEnabled: config.observability.webhooks.signing.enabled,
      runtimeBypassEnabled: config.runtime.bypass.enabled,
      onInternalError: config.runtime.onInternalError
    },
    checks
  };
}
function addModeChecks(config, checks, production) {
  if (config.mode === "off") {
    checks.push({ code: "mode.off", level: "fail", message: "Global mode is off.", hint: "Use monitor globally and block/strict per route when ready.", points: -40 });
    return;
  }
  if (config.mode === "monitor") {
    checks.push({ code: "mode.monitor", level: "warn", message: "Global mode is monitor.", hint: "This is correct for rollout; add route-level block mode for high-confidence endpoints.", points: production ? -8 : 0 });
    return;
  }
  checks.push({ code: "mode.enforcing", level: "pass", message: `Global mode is ${config.mode}.`, points: 0 });
}
function addRouteChecks(config, checks, production) {
  const routeProfiles = Object.values(config.routes).filter((route) => route.enabled !== false);
  const enforcingRoutes = routeProfiles.filter((route) => route.mode === "block" || route.mode === "strict");
  if (routeProfiles.length === 0) {
    checks.push({ code: "routes.none", level: production ? "warn" : "pass", message: "No route-specific profiles are configured.", hint: "Add profiles for /api/login, upload, private API, and admin surfaces before v1.", points: production ? -8 : 0 });
    return;
  }
  if (enforcingRoutes.length === 0 && config.mode === "monitor") {
    checks.push({ code: "routes.no_enforcement", level: production ? "warn" : "pass", message: "Route profiles exist but none are in block/strict mode.", hint: "Enable block mode on high-confidence routes after replaying false positives.", points: production ? -10 : 0 });
    return;
  }
  checks.push({ code: "routes.enforcing", level: "pass", message: `${enforcingRoutes.length} route profile(s) are enforcing.`, points: 0 });
}
function addStoreChecks(config, checks, production) {
  if (!config.rateLimit.enabled) {
    checks.push({ code: "rate_limit.disabled", level: production ? "warn" : "pass", message: "Rate limiting is disabled.", hint: "Enable rate limiting for public APIs before v1 production usage.", points: production ? -8 : 0 });
    return;
  }
  if (config.rateLimit.store === "memory" && production) {
    checks.push({ code: "rate_limit.memory", level: "warn", message: "Rate limiting uses memory store in production target.", hint: "Use Redis/Valkey for multi-instance, serverless, or horizontally scaled deployments.", points: -8 });
    return;
  }
  checks.push({ code: "rate_limit.ready", level: "pass", message: `Rate limiting is enabled with ${config.rateLimit.store} store.`, points: 0 });
}
function addRuntimeChecks(config, checks, production) {
  if (config.runtime.maxInspectionMs > 100 && production) {
    checks.push({ code: "runtime.high_max_inspection", level: "warn", message: "runtime.maxInspectionMs is above 100ms.", hint: "Keep hot-path inspection budget low for public APIs.", points: -5 });
  }
  if (!config.runtime.bypass.enabled && production) {
    checks.push({ code: "runtime.no_bypass", level: "warn", message: "Runtime bypass is disabled.", hint: "Health, readiness, liveness, and OPTIONS preflight routes should normally bypass WAF inspection.", points: -5 });
  } else {
    checks.push({ code: "runtime.bypass", level: "pass", message: "Runtime bypass is configured.", points: 0 });
  }
  if (config.runtime.onInternalError === "block" && config.mode !== "strict") {
    checks.push({ code: "runtime.fail_closed", level: "warn", message: "Internal Dhal errors fail closed.", hint: "Only use fail-closed after proving store/telemetry reliability under load.", points: -4 });
  }
}
function addObservabilityChecks(config, checks, production, env) {
  if (!config.observability.redaction.enabled) {
    checks.push({ code: "privacy.redaction_disabled", level: production ? "fail" : "warn", message: "Observability redaction is disabled.", hint: "Enable redaction before sending diagnostics/events to shared systems.", points: production ? -30 : -10 });
  } else {
    checks.push({ code: "privacy.redaction", level: "pass", message: "Observability redaction is enabled.", points: 0 });
  }
  if (config.observability.webhooks.enabled) {
    if (!config.observability.webhooks.signing.enabled) {
      checks.push({ code: "webhooks.unsigned", level: production ? "fail" : "warn", message: "Webhook alerts are enabled without signing.", hint: "Enable HMAC signing before production alert delivery.", points: production ? -25 : -10 });
    } else if (!env[config.observability.webhooks.signing.secretEnv]) {
      checks.push({ code: "webhooks.missing_secret", level: production ? "fail" : "warn", message: `Webhook signing is enabled but ${config.observability.webhooks.signing.secretEnv} is not set.`, points: production ? -25 : -10 });
    } else {
      checks.push({ code: "webhooks.signed", level: "pass", message: "Webhook signing is configured and secret is present.", points: 0 });
    }
  }
  if (config.ip.reputation.enabled && config.ip.reputation.mode === "blocking" && !env[config.ip.reputation.apiKeyEnv]) {
    checks.push({ code: "ip_reputation.blocking_missing_key", level: production ? "fail" : "warn", message: `Blocking IP reputation is enabled but ${config.ip.reputation.apiKeyEnv} is not set.`, points: production ? -25 : -10 });
  }
}
function addPolicyChecks(config, checks, production) {
  const ci = evaluateDhalCiPolicy(config);
  for (const finding of ci.findings) {
    checks.push({
      code: `ci.${finding.code}`,
      level: finding.level === "error" ? "fail" : "warn",
      message: finding.message,
      points: finding.level === "error" ? -20 : production ? -6 : -2
    });
  }
  if (config.policy.audit.enabled) {
    checks.push({ code: "policy.audit", level: "pass", message: "Policy audit explanations are enabled.", points: 0 });
  } else if (production) {
    checks.push({ code: "policy.audit_disabled", level: "warn", message: "Policy audit explanations are disabled.", hint: "Keep audit enabled through beta and v1 rollout.", points: -5 });
  }
}
function addRulesChecks(config, checks) {
  const enabledRules = getDhalRuleCatalog(config).filter((rule) => rule.enabled).length;
  if (enabledRules === 0) {
    checks.push({ code: "rules.none", level: "fail", message: "No rule catalog entries are enabled.", points: -40 });
    return;
  }
  checks.push({ code: "rules.enabled", level: "pass", message: `${enabledRules} rule catalog entries are enabled.`, points: 0 });
}
function sumPoints(checks) {
  return checks.reduce((sum, check) => sum + check.points, 0);
}
function clampScore(score) {
  return Math.max(0, Math.min(BASE_SCORE, Math.round(score)));
}

// src/report.ts
function runDhalSupportReport(options = {}) {
  const configPath = options.configPath ?? "dhal.json";
  const env = options.env ?? process.env;
  const config = loadDhalConfig(configPath);
  const compatibility = getDhalCompatibilityMatrix();
  const doctor = runDhalDoctor({ configPath, env });
  const ci = evaluateDhalCiPolicy(config);
  const enabledRules = getDhalRuleCatalog(config).filter((rule) => rule.enabled);
  const readiness = runDhalReadiness({ configPath, env });
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    packageName: "@rokadhq/dhal",
    cli: "dhal",
    version: compatibility.version,
    releaseChannel: compatibility.releaseChannel,
    configPath,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    },
    config: {
      schemaVersion: config.schemaVersion,
      mode: config.mode,
      trustProxy: config.trustProxy,
      routeProfiles: Object.keys(config.routes).length,
      rateLimitStore: config.rateLimit.store,
      ipReputationEnabled: config.ip.reputation.enabled,
      otelEnabled: config.observability.otel.enabled,
      webhooksEnabled: config.observability.webhooks.enabled,
      redactionEnabled: config.observability.redaction.enabled,
      runtimeBypassEnabled: config.runtime.bypass.enabled,
      onInternalError: config.runtime.onInternalError
    },
    env: {
      abuseIpDbKeyPresent: Boolean(env[config.ip.reputation.apiKeyEnv]),
      webhookSecretPresent: Boolean(env[config.observability.webhooks.signing.secretEnv])
    },
    doctor,
    ci,
    readiness,
    enabledRules
  };
}

// src/migrations.ts
function getDhalMigrationPlan() {
  return {
    currentSchemaVersion: DHAL_CONFIG_SCHEMA_VERSION,
    supportedInputVersions: [null, "1"],
    notes: [
      "Configs without schemaVersion are treated as pre-v0.13 configs and migrated to schemaVersion 1.",
      "Unknown schema versions are rejected.",
      "Run `npx dhal migrate dhal.json --write` before adopting v1-bound configs."
    ]
  };
}
function migrateDhalConfig(input) {
  const source = isObject(input) ? input : {};
  const rawVersion = typeof source.schemaVersion === "string" ? source.schemaVersion : null;
  const notices = [];
  let changed = false;
  if (rawVersion === null) {
    notices.push({
      level: "info",
      code: "schemaVersion.added",
      message: `Added schemaVersion ${DHAL_CONFIG_SCHEMA_VERSION}.`
    });
    changed = true;
  } else if (rawVersion !== DHAL_CONFIG_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion '${rawVersion}'. Expected '${DHAL_CONFIG_SCHEMA_VERSION}'.`);
  }
  const normalized = {
    ...source,
    schemaVersion: DHAL_CONFIG_SCHEMA_VERSION
  };
  const config = deepMerge(defaultConfig, normalized);
  return {
    ok: true,
    changed,
    fromSchemaVersion: rawVersion,
    toSchemaVersion: DHAL_CONFIG_SCHEMA_VERSION,
    config,
    notices
  };
}
function isObject(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}

// src/stability.ts
var DHAL_API_SURFACES = [
  { name: "Core engine", importPath: "@rokadhq/dhal", level: "stable", notes: "createDhal, loadDhalConfig, schema exports, release checks, and core public types are frozen for v1." },
  { name: "Express adapter", importPath: "@rokadhq/dhal/express", level: "stable", notes: "Express 4 and 5 integration behavior is part of the v1 contract." },
  { name: "Fastify adapter", importPath: "@rokadhq/dhal/fastify", level: "stable", notes: "Fastify 4 and 5 registration and enforcement behavior is part of the v1 contract." },
  { name: "Node HTTP adapter", importPath: "@rokadhq/dhal/node-http", level: "stable", notes: "The raw node:http handler API is part of the v1 contract." },
  { name: "dhal.json schemaVersion 1", importPath: "./dhal.schema.json", level: "stable", notes: "schemaVersion 1 remains backward compatible throughout v1.x." },
  { name: "CLI contract", level: "stable", notes: "The command inventory declared by @rokadhq/dhal/v1-contract remains available throughout v1.x." },
  { name: "Redis / Valkey stores", importPath: "@rokadhq/dhal/stores/redis", level: "stable", notes: "Redis 7 and Valkey 8 multi-instance behavior is covered by the v1 release gate." },
  { name: "Webhook telemetry", importPath: "@rokadhq/dhal/telemetry/webhook", level: "stable", notes: "Signed webhook payload and metadata behavior is part of the v1 contract." },
  { name: "OpenTelemetry adapter", importPath: "@rokadhq/dhal/telemetry/otel", level: "stable", notes: "The adapter API and existing emitted attributes are part of the stable v1 contract; additive attributes may be introduced in minor releases." },
  { name: "AI autosetup", importPath: "@rokadhq/dhal/autosetup", level: "experimental", notes: "Autosetup produces reviewable proposals and remains outside the stable v1 contract." },
  { name: "Internal rule scoring", level: "internal", notes: "Rule internals and scoring weights are not public API." }
];
function getDhalApiStabilityReport() {
  return {
    packageName: "@rokadhq/dhal",
    version: DHAL_PACKAGE_VERSION,
    releaseChannel: DHAL_RELEASE_CHANNEL,
    surfaces: DHAL_API_SURFACES
  };
}

// src/release-check.ts
var import_node_fs7 = require("fs");
var import_node_path7 = require("path");

// src/v1-contract.ts
var DHAL_V1_CONTRACT_VERSION = "1";
var DHAL_V1_PUBLIC_EXPORTS = Object.freeze([
  { path: ".", stability: "stable", purpose: "Core engine, configuration, policies, stores, telemetry, diagnostics, and public types." },
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
var DHAL_V1_CLI_COMMANDS = Object.freeze([
  "init",
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
]);
function validateDhalV1Contract() {
  const issues = [];
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
function findDuplicates(values) {
  const seen = /* @__PURE__ */ new Set();
  const duplicates = /* @__PURE__ */ new Set();
  for (const value2 of values) {
    if (seen.has(value2)) duplicates.add(value2);
    seen.add(value2);
  }
  return [...duplicates];
}

// src/release-check.ts
var REQUIRED_RELEASE_DOCUMENTS = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "SUPPORT_POLICY.md",
  "PRODUCTION_DEPLOYMENT.md",
  "API_STABILITY.md",
  "UPGRADING.md",
  "PUBLISHING.md",
  "RELEASE_INTEGRITY.md",
  "CHANGELOG.md"
];
var REQUIRED_RELEASE_WORKFLOWS = [
  ".github/workflows/publish.yml",
  ".github/workflows/v1-release-gate.yml",
  ".github/workflows/release-assets.yml"
];
function runDhalReleaseCheck(options = {}) {
  const rootDir = (0, import_node_path7.resolve)(options.rootDir ?? process.cwd());
  const target = options.target ?? "development";
  const requireBuild = options.requireBuild ?? target !== "development";
  const releaseChannel = String(DHAL_RELEASE_CHANNEL);
  const findings = [];
  const packageJson = readJson((0, import_node_path7.resolve)(rootDir, "package.json"));
  const packageLock = readJson((0, import_node_path7.resolve)(rootDir, "package-lock.json"));
  const packageVersion = stringValue(packageJson.version);
  add(findings, packageJson.name === "@rokadhq/dhal", "package.name", "Package name is @rokadhq/dhal.", `Unexpected package name: ${String(packageJson.name)}`);
  add(findings, packageVersion === DHAL_PACKAGE_VERSION, "version.compatibility", "Package and compatibility versions match.", `package.json is ${packageVersion}; compatibility metadata is ${DHAL_PACKAGE_VERSION}.`);
  const lockRoot = isRecord(packageLock.packages) ? packageLock.packages[""] : void 0;
  const lockVersion = isRecord(lockRoot) ? stringValue(lockRoot.version) : stringValue(packageLock.version);
  add(findings, lockVersion === packageVersion, "version.lockfile", "Package lock version matches package.json.", `package-lock.json is ${lockVersion}; package.json is ${packageVersion}.`);
  const contract = validateDhalV1Contract();
  add(findings, contract.ok, "contract.valid", "The machine-readable v1 contract is valid.", contract.issues.join(" ") || "The v1 contract is invalid.");
  const exportMap = isRecord(packageJson.exports) ? packageJson.exports : {};
  const declaredExports = new Set(Object.keys(exportMap));
  const contractExports = new Set(DHAL_V1_PUBLIC_EXPORTS.map((entry) => entry.path));
  const missingFromPackage = [...contractExports].filter((entry) => !declaredExports.has(entry));
  const unclassified = [...declaredExports].filter((entry) => !contractExports.has(entry));
  add(findings, missingFromPackage.length === 0, "exports.contract_missing", "Every v1 contract export exists in package.json.", `Missing package exports: ${missingFromPackage.join(", ")}`);
  add(findings, unclassified.length === 0, "exports.unclassified", "Every package export is classified by the v1 contract.", `Unclassified package exports: ${unclassified.join(", ")}`);
  const schema = getDhalConfigJsonSchema();
  const schemaProperties = isRecord(schema.properties) ? schema.properties : {};
  const schemaVersion = isRecord(schemaProperties.schemaVersion) ? schemaProperties.schemaVersion.const : void 0;
  add(findings, schemaVersion === "1", "schema.version", "Published configuration schema is schemaVersion 1.", `Unexpected schemaVersion contract: ${String(schemaVersion)}`);
  const packageFiles = new Set(stringArray2(packageJson.files));
  const missingDocuments = REQUIRED_RELEASE_DOCUMENTS.filter((path) => !(0, import_node_fs7.existsSync)((0, import_node_path7.resolve)(rootDir, path)));
  add(findings, missingDocuments.length === 0, "docs.required", "All required production and release documents exist.", `Missing required documents: ${missingDocuments.join(", ")}`);
  const unpublishedDocuments = REQUIRED_RELEASE_DOCUMENTS.filter((path) => !packageFiles.has(path));
  add(findings, unpublishedDocuments.length === 0, "docs.packaged", "All required production documents are included in the npm package.", `Required documents omitted from package files: ${unpublishedDocuments.join(", ")}`);
  const missingWorkflows = REQUIRED_RELEASE_WORKFLOWS.filter((path) => !(0, import_node_fs7.existsSync)((0, import_node_path7.resolve)(rootDir, path)));
  add(findings, missingWorkflows.length === 0, "workflows.required", "Publishing, release-gate, and release-asset workflows exist.", `Missing release workflows: ${missingWorkflows.join(", ")}`);
  const scripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  add(findings, stringValue(scripts["verify:supply-chain"]) !== "unknown", "supply_chain.verify_script", "Supply-chain artifacts are verified by package scripts.", "Missing verify:supply-chain script.");
  add(findings, stringValue(scripts["release:assets"]) !== "unknown", "supply_chain.asset_script", "Release assets can be generated deterministically.", "Missing release:assets script.");
  const directTargets = [
    packageJson.main,
    packageJson.module,
    packageJson.types,
    ...Object.values(isRecord(packageJson.bin) ? packageJson.bin : {})
  ].filter((entry) => typeof entry === "string");
  const buildTargets = [...collectTargets(packageJson.exports), ...directTargets].filter((entry) => entry.startsWith("./"));
  const missingBuildTargets = [...new Set(buildTargets)].filter((entry) => !(0, import_node_fs7.existsSync)((0, import_node_path7.resolve)(rootDir, entry)));
  if (missingBuildTargets.length === 0) {
    findings.push({ code: "build.targets", level: "pass", message: "Every published build target exists." });
  } else {
    findings.push({
      code: "build.targets",
      level: requireBuild ? "fail" : "warning",
      message: `Missing generated build targets: ${missingBuildTargets.join(", ")}`
    });
  }
  validateTarget(findings, target, packageVersion, releaseChannel, packageJson, packageFiles, scripts);
  return {
    ok: findings.every((finding) => finding.level !== "fail"),
    target,
    packageVersion,
    releaseChannel,
    findings
  };
}
function validateTarget(findings, target, version, releaseChannel, packageJson, packageFiles, scripts) {
  if (target === "development") {
    findings.push({ code: "release.target", level: "pass", message: "Development release checks selected." });
    return;
  }
  if (target === "rc") {
    add(findings, /^1\.0\.0-rc\.\d+$/.test(version), "release.version", "Version is a Dhal v1 release candidate.", `RC target requires 1.0.0-rc.N; found ${version}.`);
    add(findings, releaseChannel === "rc", "release.channel", "Release channel is rc.", `RC target requires release channel rc; found ${releaseChannel}.`);
    return;
  }
  add(findings, /^1\.\d+\.\d+$/.test(version), "release.version", "Version is a stable v1 release.", `Stable target requires 1.x.y without a prerelease suffix; found ${version}.`);
  add(findings, releaseChannel === "latest", "release.channel", "Release channel is latest.", `Stable target requires release channel latest; found ${releaseChannel}.`);
  add(findings, !stringValue(packageJson.description).toLowerCase().includes("release-candidate"), "stable.description", "Package description is stable-release language.", "Stable package description still contains release-candidate language.");
  add(findings, !packageFiles.has("ALPHA.md") && !packageFiles.has("BETA.md"), "stable.package_files", "Prerelease guidance is excluded from the stable package.", "Stable package files still include ALPHA.md or BETA.md.");
  add(findings, stringValue(scripts["release:check"]).includes("--target stable"), "stable.default_check", "Default release check targets stable.", "Default release:check script does not target stable.");
  add(findings, !stringValue(scripts["publish:ci"]).includes("--tag rc"), "stable.publish_tag", "CI publishing no longer pins the rc tag.", "Stable publish:ci script still pins the rc dist-tag.");
}
function add(findings, condition, code, pass, fail) {
  findings.push({ code, level: condition ? "pass" : "fail", message: condition ? pass : fail });
}
function collectTargets(value2) {
  if (typeof value2 === "string") return [value2];
  if (Array.isArray(value2)) return value2.flatMap(collectTargets);
  if (isRecord(value2)) return Object.values(value2).flatMap(collectTargets);
  return [];
}
function readJson(path) {
  if (!(0, import_node_fs7.existsSync)(path)) throw new Error(`Required release file is missing: ${path}`);
  const value2 = JSON.parse((0, import_node_fs7.readFileSync)(path, "utf8"));
  if (!isRecord(value2)) throw new Error(`Expected a JSON object in ${path}`);
  return value2;
}
function stringArray2(value2) {
  return Array.isArray(value2) ? value2.filter((entry) => typeof entry === "string") : [];
}
function stringValue(value2) {
  return typeof value2 === "string" ? value2 : "unknown";
}
function isRecord(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}

// src/cli.ts
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
    case "release-check":
      return finish(runDhalReleaseCheck({
        rootDir: value("--root") ?? process.cwd(),
        target: value("--target") ?? "development",
        requireBuild: has("--require-build") ? true : void 0
      }));
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
  const target = (0, import_node_path8.resolve)(path);
  if ((0, import_node_fs8.existsSync)(target)) throw new Error(`Refusing to overwrite existing config: ${target}`);
  (0, import_node_fs8.writeFileSync)(target, `${JSON.stringify(defaultConfig, null, 2)}
`);
  console.log(`Created ${target}`);
}
function migrate(inputPath, outputPath) {
  const target = (0, import_node_path8.resolve)(inputPath);
  const raw = (0, import_node_fs8.existsSync)(target) ? JSON.parse((0, import_node_fs8.readFileSync)(target, "utf8")) : {};
  const result = migrateDhalConfig(raw);
  if (has("--check")) return finish({ ...result, config: void 0, plan: getDhalMigrationPlan() });
  if (has("--write") || outputPath) {
    const out = (0, import_node_path8.resolve)(outputPath ?? inputPath);
    (0, import_node_fs8.writeFileSync)(out, `${JSON.stringify(result.config, null, 2)}
`);
    return output({ ok: result.ok, wrote: out, changed: result.changed, notices: result.notices });
  }
  output(result);
}
function report(configPath) {
  const result = runDhalSupportReport({ configPath });
  const out = value("--output");
  if (out) {
    (0, import_node_fs8.writeFileSync)((0, import_node_path8.resolve)(out), `${JSON.stringify(result, null, 2)}
`);
    return output({ ok: true, wrote: (0, import_node_path8.resolve)(out) });
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
    (0, import_node_fs8.writeFileSync)((0, import_node_path8.resolve)(out), `${JSON.stringify(config, null, 2)}
`);
    return output({ ok: true, preset: name, wrote: (0, import_node_path8.resolve)(out) });
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
  const fixtures = JSON.parse((0, import_node_fs8.readFileSync)((0, import_node_path8.resolve)(path), "utf8"));
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
  (0, import_node_fs8.writeFileSync)((0, import_node_path8.resolve)(path), `${JSON.stringify(data, null, 2)}
`);
  console.log(`Created ${(0, import_node_path8.resolve)(path)}`);
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

Commands: init, test-config, explain-config, schema, migrate, ci, doctor, report, rules, readiness, compat, stability, release-check, presets, autosetup, replay, simulate

Release gate: dhal release-check --target development|rc|stable [--require-build]

Use --json for machine-readable output.`);
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
