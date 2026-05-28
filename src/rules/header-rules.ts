import type { DhalConfig, DhalDecision, DhalRequest } from "../types.js";
import { getHeader } from "../utils/ip.js";

export function evaluateHeaderRules(req: DhalRequest, config: DhalConfig): DhalDecision | undefined {
  const rule = config.rules.headers;
  if (!rule.enabled) return undefined;

  const entries = Object.entries(req.headers);
  const headerCount = entries.length;
  const headerBytes = entries.reduce((sum, [name, value]) => sum + name.length + headerValueBytes(value), 0);

  if (headerCount > rule.maxHeaderCount) {
    return block(config, "Header count exceeds configured maximum", 60, {
      check: "maxHeaderCount",
      headerCount,
      maxHeaderCount: rule.maxHeaderCount,
      confidence: 0.82
    });
  }

  if (headerBytes > rule.maxHeaderBytes) {
    return block(config, "Header bytes exceed configured maximum", 60, {
      check: "maxHeaderBytes",
      headerBytes,
      maxHeaderBytes: rule.maxHeaderBytes,
      confidence: 0.82
    });
  }

  if (rule.requireHostHeader && !getHeader(req.headers, "host")) {
    return block(config, "Missing Host header", 45, {
      check: "missingHost",
      confidence: 0.65
    });
  }

  for (const headerName of rule.suspiciousHeaders) {
    const value = getHeader(req.headers, headerName);
    if (value) {
      return block(config, "Suspicious proxy or rewrite header present", 65, {
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
      return block(config, "Conflicting forwarding headers", 55, {
        check: "conflictingForwardingHeaders",
        confidence: 0.68
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
    ruleId: "header.anomaly",
    score,
    meta: {
      ...meta,
      threatKind: "header"
    }
  };
}

function headerValueBytes(value: string | string[] | undefined): number {
  if (value === undefined) return 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + item.length, 0);
  return value.length;
}
