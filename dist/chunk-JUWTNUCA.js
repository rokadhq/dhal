// src/config.ts
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
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
  const resolvedPath = resolve(process.cwd(), configPath);
  let fileConfig = {};
  if (existsSync(resolvedPath)) {
    const raw = readFileSync(resolvedPath, "utf8");
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

export {
  defaultConfig,
  loadDhalConfig,
  deepMerge
};
