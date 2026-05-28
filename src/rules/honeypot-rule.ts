import type { DhalConfig, DhalDecision, DhalRequest } from "../types.js";
import { getHeader } from "../utils/ip.js";
import { matchesRoutePattern } from "../utils/route.js";

export function evaluateHoneypotRule(req: DhalRequest, config: DhalConfig): DhalDecision | undefined {
  const rule = config.rules.honeypot;
  if (!rule.enabled) return undefined;

  for (const path of rule.paths) {
    if (matchesRoutePattern(req.path, path)) {
      return block(config, "path", path);
    }
  }

  const params = readQueryParams(req.url);
  for (const param of rule.queryParams) {
    if (params.has(param)) {
      return block(config, "query_param", param);
    }
  }

  for (const header of rule.headers) {
    if (getHeader(req.headers, header) !== undefined) {
      return block(config, "header", header.toLowerCase());
    }
  }

  return undefined;
}

function block(config: DhalConfig, matchedType: string, matchedValue: string): DhalDecision {
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

function readQueryParams(url: string): URLSearchParams {
  try {
    return new URL(url, "http://dhal.local").searchParams;
  } catch {
    const query = url.split("?")[1] ?? "";
    return new URLSearchParams(query);
  }
}
