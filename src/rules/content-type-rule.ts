import type { DhalConfig, DhalDecision, DhalRequest } from "../types.js";
import { getHeader } from "../utils/ip.js";

export function evaluateContentTypeRule(req: DhalRequest, config: DhalConfig): DhalDecision | undefined {
  const rule = config.rules.contentType;
  if (!rule.enabled) return undefined;

  const method = req.method.toUpperCase();
  const hasBody = hasRequestBody(req, config.rules.api.methodsWithBody);
  const contentType = normalizeContentType(getHeader(req.headers, "content-type"));

  if (hasBody && rule.blockMissingOnBodyMethods && !contentType) {
    return block(config, "Request body method missing Content-Type", 45, {
      check: "missingContentType",
      method,
      confidence: 0.62
    });
  }

  if (rule.blockJsonMismatch && contentType && matchesMime(contentType, rule.allowedJsonMimeTypes)) {
    const raw = getRawBody(req);
    if (raw && !looksLikeJson(raw)) {
      return block(config, "JSON Content-Type does not match request body", 70, {
        check: "jsonBodyMismatch",
        contentType,
        confidence: 0.9
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
    ruleId: "content_type.mismatch",
    score,
    meta: {
      ...meta,
      threatKind: "content_type"
    }
  };
}

function hasRequestBody(req: DhalRequest, methodsWithBody: string[]): boolean {
  const method = req.method.toUpperCase();
  const configuredMethod = methodsWithBody.includes(method);
  const length = getHeader(req.headers, "content-length");
  const parsedLength = length ? Number(length) : undefined;
  return configuredMethod && (parsedLength === undefined || parsedLength > 0 || req.rawBody !== undefined || req.body !== undefined);
}

function getRawBody(req: DhalRequest): string | undefined {
  if (typeof req.rawBody === "string") return req.rawBody.trim();
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString("utf8").trim();
  if (typeof req.body === "string") return req.body.trim();
  return undefined;
}

function looksLikeJson(value: string): boolean {
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
