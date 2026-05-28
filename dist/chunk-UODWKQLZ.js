import {
  MemorySignalStore
} from "./chunk-IRZXZAQ4.js";
import {
  OpenTelemetryDhalTelemetry
} from "./chunk-JCY2QFLP.js";
import {
  WebhookDhalTelemetry
} from "./chunk-BGMTMZGL.js";
import {
  deepMerge,
  loadDhalConfig
} from "./chunk-JUWTNUCA.js";
import {
  createAbuseIpDbProviderFromConfig
} from "./chunk-X7PS5EQX.js";

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
var SEVERITY_RANK = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};
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
function severityAtLeast(actual, minimum) {
  return SEVERITY_RANK[actual] >= SEVERITY_RANK[minimum];
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
import { isIP } from "net";
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
  if (normalizedPattern.includes("*") && isIP(ip) === 4) {
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
  const family = isIP(range);
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
  if (isIP(ip) !== 6) return null;
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
  if (isIP(normalized) === 6) {
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
};

// src/telemetry/events.ts
import { EventEmitter } from "events";
var DhalEventBus = class extends EventEmitter {
  emitDecision(event) {
    this.emit("decision", event);
    if (event.decision.action === "block" || event.decision.wouldBlock) {
      this.emit("threat", event);
      if (event.threatKind) {
        this.emit(`threat:${event.threatKind}`, event);
      }
    }
  }
  emitSignal(signal) {
    this.emit("signal", signal);
    this.emit(`signal:${signal.kind}`, signal);
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
};

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
import { randomUUID } from "crypto";
import { performance } from "perf_hooks";

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

// src/engine.ts
function createDhal(options = {}) {
  const config = loadDhalConfig(options.configPath, options.config);
  const logger = options.logger ?? console;
  const events = new DhalEventBus();
  const rateLimitStore = options.rateLimitStore ?? new MemoryRateLimitStore();
  const signalStore = options.signalStore ?? new MemorySignalStore();
  const ipReputationProvider = options.ipReputationProvider ?? createAbuseIpDbProviderFromConfig(config);
  const telemetry = options.telemetry ?? createTelemetry(config);
  const ipReputationCache = new IpReputationCache();
  if (config.rateLimit.store === "redis" && !options.rateLimitStore) {
    logger.warn("[dhal] rateLimit.store is set to redis, but no rateLimitStore was provided. Falling back to memory store.");
  }
  if (config.ip.reputation.enabled && !ipReputationProvider) {
    logger.warn(`[dhal] IP reputation is enabled, but no provider is configured. Set ${config.ip.reputation.apiKeyEnv} or pass ipReputationProvider.`);
  }
  async function inspect(req) {
    const startedAt = performance.now();
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
      decision = {
        action: effectiveConfig.mode === "strict" ? "block" : "allow",
        statusCode: effectiveConfig.mode === "strict" ? 500 : 200,
        reason: "Dhal internal rule evaluation error",
        ruleId: "dhal.internal_error",
        score: effectiveConfig.mode === "strict" ? 100 : 0,
        meta: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
    decision = enrichDecision(decision, effectiveConfig, context.routePattern, context.routeProfile);
    const durationMs = performance.now() - startedAt;
    const ruleCategory = deriveRuleCategory(decision.ruleId);
    const policyDecision = applyPolicyToDecision(decision, {
      req: normalizedReq,
      config: effectiveConfig,
      routePattern: context.routePattern,
      routeProfile: context.routeProfile,
      ruleCategory
    });
    const emitted = applyMode(policyDecision, effectiveConfig);
    const event = buildEvent(normalizedReq, emitted, durationMs, effectiveConfig);
    const shouldEmit = shouldEmitSecurityEvent(event, effectiveConfig);
    if (effectiveConfig.observability.events.enabled && shouldEmit) {
      events.emitDecision(event);
    }
    if (shouldEmit) {
      telemetry?.recordDecision(event);
    }
    if (effectiveConfig.observability.logs.enabled && shouldEmit && (emitted.action === "block" || emitted.wouldBlock)) {
      writeLog(logger, effectiveConfig, event);
    }
    return emitted;
  }
  async function recordOutcome(req, outcome) {
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
  return {
    config,
    events,
    inspect,
    recordOutcome
  };
}
async function evaluate(req, config, rateLimitStore, signalStore, ipReputation) {
  if (config.mode === "off") return allow("Dhal disabled");
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
  const baseEvent = {
    eventId: randomUUID(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    correlationId: req.correlationId ?? extractCorrelationId(req, config),
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      route: req.route,
      userId: req.userId,
      tenantId: req.tenantId,
      apiKeyId: req.apiKeyId,
      userAgent: getHeader(req.headers, "user-agent")
    },
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

export {
  IpReputationCache,
  applyPolicyToDecision,
  resolveSeverity,
  shouldEmitSecurityEvent,
  severityAtLeast,
  extractClientIp,
  isCredentialRoute,
  buildCredentialKey,
  MemoryRateLimitStore,
  CompositeDhalTelemetry,
  DhalEventBus,
  extractIdentity,
  createDhal
};
