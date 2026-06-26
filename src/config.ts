import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DhalConfig, DhalCredentialStuffingKey, DhalIdentityKey, DhalMode, DhalRouteProfile, DhalSeverity, PartialDeep } from "./types.js";

export const DHAL_CONFIG_SCHEMA_VERSION = "1" as const;

export const defaultConfig: DhalConfig = {
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
      cacheTtlSeconds: 86_400,
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

export function loadDhalConfig(configPath = "dhal.json", override?: PartialDeep<DhalConfig>): DhalConfig {
  const resolvedPath = resolve(process.cwd(), configPath);
  let fileConfig: PartialDeep<DhalConfig> = {};

  if (existsSync(resolvedPath)) {
    const raw = readFileSync(resolvedPath, "utf8");
    fileConfig = JSON.parse(raw) as PartialDeep<DhalConfig>;
  }

  const merged = deepMerge(defaultConfig, fileConfig, override ?? {}) as DhalConfig;
  validateConfig(merged);
  return merged;
}

export function deepMerge<T extends Record<string, unknown>>(...objects: Array<PartialDeep<T>>): T {
  const output: Record<string, unknown> = {};

  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj ?? {})) {
      const current = output[key];
      if (Array.isArray(value)) {
        output[key] = value;
      } else if (isPlainObject(value) && isPlainObject(current)) {
        output[key] = deepMerge(current as Record<string, unknown>, value as Record<string, unknown>);
      } else if (isPlainObject(value)) {
        output[key] = deepMerge({}, value as Record<string, unknown>);
      } else if (value !== undefined) {
        output[key] = value;
      }
    }
  }

  return output as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateConfig(config: DhalConfig): void {
  if (config.schemaVersion !== DHAL_CONFIG_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${String(config.schemaVersion)}. Expected ${DHAL_CONFIG_SCHEMA_VERSION}. Run \`npx dhal migrate --write\`.`);
  }

  assertMode(config.mode, "mode");

  const stores = new Set(["memory", "redis"]);
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

function validateRouteProfile(pattern: string, profile: DhalRouteProfile): void {
  validateRoutePattern(pattern, `routes.${pattern}`);

  if (profile.mode !== undefined) {
    assertMode(profile.mode, `routes.${pattern}.mode`);
  }

  if (profile.rateLimit) {
    if (profile.rateLimit.enabled !== false) {
      const max = profile.rateLimit.max;
      const windowSeconds = profile.rateLimit.windowSeconds;
      if (max !== undefined || windowSeconds !== undefined) {
        validateRateLimit(`routes.${pattern}.rateLimit`, max ?? 1, windowSeconds ?? 1);
      }
    }

    if (profile.rateLimit.keyBy) {
      validateKeyBy(`routes.${pattern}.rateLimit.keyBy`, profile.rateLimit.keyBy);
    }
  }

  if (profile.rules) {
    if (profile.rules.largePayload?.maxBytes !== undefined && profile.rules.largePayload.maxBytes < 1) {
      throw new Error(`routes.${pattern}.rules.largePayload.maxBytes must be >= 1`);
    }

    if (profile.rules.bot?.scoreThreshold !== undefined) {
      validateScore(`routes.${pattern}.rules.bot.scoreThreshold`, profile.rules.bot.scoreThreshold);
    }

    if (profile.rules.bot?.falsePositiveControls?.minSignals !== undefined && (!Number.isInteger(profile.rules.bot.falsePositiveControls.minSignals) || profile.rules.bot.falsePositiveControls.minSignals < 1)) {
      throw new Error(`routes.${pattern}.rules.bot.falsePositiveControls.minSignals must be an integer >= 1`);
    }

    for (const ignoredPath of profile.rules.bot?.falsePositiveControls?.ignorePaths ?? []) {
      validateRoutePattern(ignoredPath, `routes.${pattern}.rules.bot.falsePositiveControls.ignorePaths[]`);
    }

    if (profile.rules.credentialStuffing?.maxFailures !== undefined && profile.rules.credentialStuffing.maxFailures < 1) {
      throw new Error(`routes.${pattern}.rules.credentialStuffing.maxFailures must be >= 1`);
    }

    if (profile.rules.credentialStuffing?.windowSeconds !== undefined && profile.rules.credentialStuffing.windowSeconds < 1) {
      throw new Error(`routes.${pattern}.rules.credentialStuffing.windowSeconds must be >= 1`);
    }

    if (profile.rules.credentialStuffing?.keyBy) {
      validateCredentialKeyBy(`routes.${pattern}.rules.credentialStuffing.keyBy`, profile.rules.credentialStuffing.keyBy);
    }
  }

  if (profile.ipReputation?.minScore !== undefined) {
    validateScore(`routes.${pattern}.ipReputation.minScore`, profile.ipReputation.minScore);
  }

  if (profile.ipReputation?.mode !== undefined && !new Set(["async", "blocking"]).has(profile.ipReputation.mode)) {
    throw new Error(`routes.${pattern}.ipReputation.mode must be async or blocking`);
  }

  if (profile.response?.blockStatusCode !== undefined) {
    validateResponse(`routes.${pattern}.response`, profile.response.blockStatusCode);
  }
}

function validateRuntime(config: DhalConfig): void {
  if (!new Set(["allow", "block"]).has(config.runtime.onInternalError)) {
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

function validateRuleConfig(path: string, rules: DhalConfig["rules"]): void {
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

function validateRedaction(config: DhalConfig): void {
  const redactionModes = new Set(["none", "mask", "hash", "omit"]);
  if (!redactionModes.has(config.observability.redaction.ip)) {
    throw new Error("observability.redaction.ip must be none, mask, hash, or omit");
  }
  if (!redactionModes.has(config.observability.redaction.identity)) {
    throw new Error("observability.redaction.identity must be none, mask, hash, or omit");
  }
  if (!new Set(["full", "omit"]).has(config.observability.redaction.userAgent)) {
    throw new Error("observability.redaction.userAgent must be full or omit");
  }
}

function validatePolicy(config: DhalConfig): void {
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

  const ids = new Set<string>();
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

function validateIdentityHeaders(config: DhalConfig): void {
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

function validateReputation(config: DhalConfig): void {
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

  if (!new Set(["async", "blocking"]).has(config.ip.reputation.mode)) {
    throw new Error("ip.reputation.mode must be async or blocking");
  }
}

function validateObservability(config: DhalConfig): void {
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

function validateRoutePattern(pattern: string, path: string): void {
  if (!pattern.startsWith("/")) {
    throw new Error(`${path} must start with /`);
  }
}

function validateRateLimit(path: string, max: number, windowSeconds: number): void {
  if (!Number.isInteger(max) || max < 1) {
    throw new Error(`${path}.max must be an integer >= 1`);
  }

  if (!Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new Error(`${path}.windowSeconds must be an integer >= 1`);
  }
}

function validateKeyBy(path: string, keyBy: DhalIdentityKey[]): void {
  const allowed = new Set<DhalIdentityKey>(["ip", "route", "userId", "tenantId", "apiKeyId"]);

  if (!Array.isArray(keyBy) || keyBy.length === 0) {
    throw new Error(`${path} must contain at least one key`);
  }

  for (const key of keyBy) {
    if (!allowed.has(key)) {
      throw new Error(`${path} contains invalid key: ${key}`);
    }
  }
}

function validateCredentialKeyBy(path: string, keyBy: DhalCredentialStuffingKey[]): void {
  const allowed = new Set<DhalCredentialStuffingKey>(["ip", "route", "userId", "tenantId", "apiKeyId", "userAgent"]);

  if (!Array.isArray(keyBy) || keyBy.length === 0) {
    throw new Error(`${path} must contain at least one key`);
  }

  for (const key of keyBy) {
    if (!allowed.has(key)) {
      throw new Error(`${path} contains invalid key: ${key}`);
    }
  }
}

function validateRulePacks(path: string, packs: DhalConfig["rules"]["packs"]): void {
  const allowed = new Set(["generic-web", "api", "auth", "wordpress", "strict-api"]);
  if (!Array.isArray(packs)) throw new Error(`${path} must be an array`);
  for (const pack of packs) {
    if (!allowed.has(pack)) throw new Error(`${path} contains invalid rule pack: ${pack}`);
  }
}

function validateHttpMethod(path: string, method: string): void {
  if (!/^[A-Z]{2,12}$/.test(method)) {
    throw new Error(`${path} contains invalid HTTP method: ${method}`);
  }
}

function validateHeaderName(path: string, header: string): void {
  if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/i.test(header)) {
    throw new Error(`${path} contains invalid HTTP header name: ${header}`);
  }
}

function validateMimePattern(path: string, contentType: string): void {
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+*-]+$/i.test(contentType)) {
    throw new Error(`${path} contains invalid MIME type pattern: ${contentType}`);
  }
}

function assertMode(mode: DhalMode, path: string): void {
  const modes = new Set(["off", "monitor", "block", "strict"]);
  if (!modes.has(mode)) {
    throw new Error(`Invalid ${path}: ${mode}`);
  }
}

function validateResponse(path: string, statusCode: number): void {
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    throw new Error(`${path}.blockStatusCode must be a 4xx or 5xx integer`);
  }
}

function validateScore(path: string, score: number): void {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(`${path} must be an integer between 0 and 100`);
  }
}

function validateSampleRate(path: string, rate: number): void {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`${path} must be a number between 0 and 1`);
  }
}

function validateSeverity(path: string, severity: DhalSeverity): void {
  const severities = new Set(["info", "low", "medium", "high", "critical"]);
  if (!severities.has(severity)) {
    throw new Error(`${path} must be one of info, low, medium, high, critical`);
  }
}
