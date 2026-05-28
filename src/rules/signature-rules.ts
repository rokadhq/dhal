import type { DhalConfig, DhalDecision, DhalHeaders, DhalRequest, DhalRulePackName } from "../types.js";
import { getHeader } from "../utils/ip.js";

type SignatureRule = {
  id: string;
  category: "sqli" | "xss" | "path_traversal" | "bad_user_agent" | "ssrf" | "rce" | "wordpress" | "graphql" | "template_injection";
  enabled: (config: DhalConfig) => boolean;
  target: (req: DhalRequest) => string;
  pattern: RegExp;
  score: number;
  confidence: number;
  reason: string;
  packs?: DhalRulePackName[];
};

const BAD_USER_AGENTS = /(?:sqlmap|nikto|nmap|masscan|acunetix|nessus|wpscan|dirbuster|gobuster|zgrab|curl\/7\.29\.0)/i;

const SIGNATURES: SignatureRule[] = [
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

export function evaluateSignatureRules(req: DhalRequest, config: DhalConfig): DhalDecision | undefined {
  const payloadDecision = evaluateLargePayload(req, config);
  if (payloadDecision) return payloadDecision;

  for (const rule of SIGNATURES) {
    if (!rule.enabled(config)) continue;

    const target = rule.target(req);
    if (target.length > 64_000) continue;

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

  return undefined;
}

function evaluateLargePayload(req: DhalRequest, config: DhalConfig): DhalDecision | undefined {
  if (!config.rules.largePayload.enabled) return undefined;

  const contentLength = getContentLength(req.headers) ?? req.contentLength;
  if (contentLength === undefined) return undefined;

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

  return undefined;
}

function requestSurface(req: DhalRequest): string {
  const body = typeof req.rawBody === "string"
    ? req.rawBody
    : Buffer.isBuffer(req.rawBody)
      ? req.rawBody.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : req.body && typeof req.body === "object"
          ? JSON.stringify(req.body).slice(0, 64_000)
          : "";

  const raw = `${req.method} ${req.url}\n${body}`;
  const decodedOnce = decodeLoose(raw);
  const decodedTwice = decodedOnce === raw ? decodedOnce : decodeLoose(decodedOnce);
  return [raw, decodedOnce, decodedTwice].filter((value, index, values) => values.indexOf(value) === index).join("\n");
}

function decodeLoose(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function hasAnyPack(config: DhalConfig, packs: DhalRulePackName[]): boolean {
  return packs.some((pack) => config.rules.packs.includes(pack));
}

function getContentLength(headers: DhalHeaders): number | undefined {
  const raw = getHeader(headers, "content-length");
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}
