import type { DhalConfig, DhalDecision, DhalRequest } from "../types.js";
import { getHeader } from "../utils/ip.js";

export function evaluateApiPositiveSecurityRule(req: DhalRequest, config: DhalConfig): DhalDecision | undefined {
  const rule = config.rules.api;
  if (!rule.enabled) return undefined;

  const method = req.method.toUpperCase();
  if (!rule.methodsWithBody.includes(method)) return undefined;

  const contentType = normalizeContentType(getHeader(req.headers, "content-type"));
  const hasBody = req.body !== undefined || req.rawBody !== undefined || Number(getHeader(req.headers, "content-length") ?? 0) > 0;

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
  if (json !== undefined) {
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

  return undefined;
}

function block(config: DhalConfig, reason: string, score: number, meta: Record<string, unknown>): DhalDecision {
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

function getJsonValue(req: DhalRequest): unknown | undefined {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.rawBody === "string") return parseJsonOrUndefined(req.rawBody);
  if (Buffer.isBuffer(req.rawBody)) return parseJsonOrUndefined(req.rawBody.toString("utf8"));
  if (typeof req.body === "string") return parseJsonOrUndefined(req.body);
  return undefined;
}

function parseJsonOrUndefined(value: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed || !/^[\[{]/.test(trimmed)) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function inspectJson(value: unknown, depth = 0): { depth: number; keys: number } {
  if (Array.isArray(value)) {
    return value.reduce((acc, item) => {
      const child = inspectJson(item, depth + 1);
      return { depth: Math.max(acc.depth, child.depth), keys: acc.keys + child.keys };
    }, { depth: depth + 1, keys: 0 });
  }

  if (value && typeof value === "object") {
    const entries = Object.values(value as Record<string, unknown>);
    return entries.reduce<{ depth: number; keys: number }>((acc, item) => {
      const child = inspectJson(item, depth + 1);
      return { depth: Math.max(acc.depth, child.depth), keys: acc.keys + child.keys };
    }, { depth: depth + 1, keys: Object.keys(value as Record<string, unknown>).length });
  }

  return { depth, keys: 0 };
}

function normalizeContentType(value: string | undefined): string | undefined {
  return value?.split(";")[0]?.trim().toLowerCase();
}

function matchesMime(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const normalized = pattern.toLowerCase();
    if (normalized.endsWith("/*")) return value.startsWith(normalized.slice(0, -1));
    return normalized === value;
  });
}
