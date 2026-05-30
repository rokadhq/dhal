import type { DhalConfig, DhalRulePackName, DhalSeverity } from "../types.js";

export type DhalRuleCatalogEntry = {
  id: string;
  category: string;
  title: string;
  description: string;
  defaultSeverity: DhalSeverity;
  defaultAction: "allow" | "monitor" | "block";
  confidence: number;
  enabledByDefault: boolean;
  configPath: string;
  packs?: DhalRulePackName[] | undefined;
  falsePositiveNotes?: string | undefined;
};

export type DhalRuleCatalogRow = DhalRuleCatalogEntry & {
  enabled?: boolean | undefined;
  effectiveSeverity?: DhalSeverity | undefined;
};

export const DHAL_RULE_CATALOG: DhalRuleCatalogEntry[] = [
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

export function getDhalRuleCatalog(config?: DhalConfig): DhalRuleCatalogRow[] {
  return DHAL_RULE_CATALOG.map((entry) => ({
    ...entry,
    enabled: config ? isCatalogEntryEnabled(entry, config) : entry.enabledByDefault,
    effectiveSeverity: config ? resolveCatalogSeverity(entry, config) : entry.defaultSeverity
  }));
}

export function findDhalRule(id: string): DhalRuleCatalogEntry | undefined {
  return DHAL_RULE_CATALOG.find((entry) => entry.id === id);
}

function resolveCatalogSeverity(entry: DhalRuleCatalogEntry, config: DhalConfig): DhalSeverity {
  return config.policy.severity.rules[entry.id]
    ?? config.policy.severity.categories[entry.category]
    ?? entry.defaultSeverity;
}

function isCatalogEntryEnabled(entry: DhalRuleCatalogEntry, config: DhalConfig): boolean {
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
