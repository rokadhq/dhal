type DhalMode = "off" | "monitor" | "block" | "strict";
type DhalAction = "allow" | "block" | "log";
type DhalSeverity = "info" | "low" | "medium" | "high" | "critical";
type DhalRulePackName = "generic-web" | "api" | "auth" | "wordpress" | "strict-api";
type DhalHeaders = Record<string, string | string[] | undefined>;
type DhalIdentityKey = "ip" | "route" | "userId" | "tenantId" | "apiKeyId";
type DhalCredentialStuffingKey = DhalIdentityKey | "userAgent";
type DhalRequest = {
    method: string;
    url: string;
    path: string;
    headers: DhalHeaders;
    ip: string;
    route?: string | undefined;
    userId?: string | undefined;
    tenantId?: string | undefined;
    apiKeyId?: string | undefined;
    correlationId?: string | undefined;
    body?: unknown | undefined;
    rawBody?: string | Buffer | undefined;
    contentLength?: number | undefined;
};
type DhalDecision = {
    action: DhalAction;
    statusCode: number;
    reason: string;
    ruleId?: string;
    score: number;
    severity?: DhalSeverity | undefined;
    wouldBlock?: boolean;
    meta?: Record<string, unknown>;
};
type DhalRateLimitConfig = {
    windowSeconds: number;
    max: number;
};
type DhalRateLimitStoreName = "memory" | "redis";
type DhalIpReputationProviderName = "abuseipdb" | "custom";
type DhalBotRuleConfig = {
    enabled: boolean;
    scoreThreshold: number;
    blockEmptyUserAgent: boolean;
    suspiciousUserAgents: string[];
    allowUserAgents: string[];
    falsePositiveControls: {
        minSignals: number;
        skipStaticAssets: boolean;
        ignorePaths: string[];
        ignorePrivateIps: boolean;
    };
    signals: {
        missingAcceptHeaderScore: number;
        emptyUserAgentScore: number;
        suspiciousUserAgentScore: number;
        headlessHeaderScore: number;
        automationHeaderScore: number;
        browserHeaderMismatchScore: number;
    };
};
type DhalHoneypotRuleConfig = {
    enabled: boolean;
    headers: string[];
    queryParams: string[];
    paths: string[];
};
type DhalCredentialStuffingRuleConfig = {
    enabled: boolean;
    loginPathPatterns: string[];
    failureStatusCodes: number[];
    windowSeconds: number;
    maxFailures: number;
    keyBy: DhalCredentialStuffingKey[];
};
type DhalApiPositiveSecurityConfig = {
    enabled: boolean;
    requireJsonContentType: boolean;
    allowedContentTypes: string[];
    methodsWithBody: string[];
    maxJsonDepth: number;
    maxJsonKeys: number;
};
type DhalHeaderAnomalyConfig = {
    enabled: boolean;
    requireHostHeader: boolean;
    maxHeaderCount: number;
    maxHeaderBytes: number;
    suspiciousHeaders: string[];
    blockConflictingForwardingHeaders: boolean;
};
type DhalContentTypeConfig = {
    enabled: boolean;
    blockMissingOnBodyMethods: boolean;
    blockJsonMismatch: boolean;
    allowedJsonMimeTypes: string[];
};
type DhalRuleConfig = {
    packs: DhalRulePackName[];
    sqli: boolean;
    xss: boolean;
    pathTraversal: boolean;
    badUserAgents: boolean;
    largePayload: {
        enabled: boolean;
        maxBytes: number;
    };
    api: DhalApiPositiveSecurityConfig;
    headers: DhalHeaderAnomalyConfig;
    contentType: DhalContentTypeConfig;
    bot: DhalBotRuleConfig;
    honeypot: DhalHoneypotRuleConfig;
    credentialStuffing: DhalCredentialStuffingRuleConfig;
};
type DhalRouteRuleConfig = PartialDeep<DhalRuleConfig>;
type DhalRouteProfile = {
    enabled?: boolean | undefined;
    mode?: DhalMode | undefined;
    tags?: string[] | undefined;
    rules?: DhalRouteRuleConfig | undefined;
    rateLimit?: (Partial<DhalRateLimitConfig> & {
        enabled?: boolean | undefined;
        keyBy?: DhalIdentityKey[] | undefined;
    }) | undefined;
    ipReputation?: {
        enabled?: boolean | undefined;
        minScore?: number | undefined;
        mode?: "async" | "blocking" | undefined;
    } | undefined;
    response?: {
        blockStatusCode?: number | undefined;
        message?: string | undefined;
    } | undefined;
};
type DhalRuleSuppression = {
    id: string;
    enabled: boolean;
    reason: string;
    ruleId?: string | undefined;
    ruleCategory?: string | undefined;
    route?: string | undefined;
    path?: string | undefined;
    ip?: string | undefined;
    userId?: string | undefined;
    tenantId?: string | undefined;
    apiKeyId?: string | undefined;
    expiresAt?: string | undefined;
};
type DhalSamplingConfig = {
    enabled: boolean;
    rate: number;
    includeBlocked: boolean;
    includeWouldBlock: boolean;
    rules: Record<string, number>;
    routes: Record<string, number>;
};
type DhalPolicyConfig = {
    severity: {
        default: DhalSeverity;
        categories: Record<string, DhalSeverity>;
        rules: Record<string, DhalSeverity>;
    };
    suppressions: DhalRuleSuppression[];
    sampling: DhalSamplingConfig;
    audit: {
        enabled: boolean;
        includeSuppressed: boolean;
    };
    ci: {
        failOnModes: DhalMode[];
        requireWebhookSigning: boolean;
        requireNonMonitorRouteForRules: string[];
        disallowExpiredSuppressions: boolean;
    };
};
type DhalConfig = {
    mode: DhalMode;
    trustProxy: boolean;
    identity: {
        headers: {
            userId: string[];
            tenantId: string[];
            apiKeyId: string[];
        };
    };
    ip: {
        allow: string[];
        block: string[];
        reputation: {
            enabled: boolean;
            provider: DhalIpReputationProviderName;
            apiKeyEnv: string;
            minScore: number;
            cacheTtlSeconds: number;
            maxAgeInDays: number;
            mode: "async" | "blocking";
            timeoutMs: number;
        };
    };
    rateLimit: {
        enabled: boolean;
        store: DhalRateLimitStoreName;
        keyBy: DhalIdentityKey[];
        default: DhalRateLimitConfig;
        routes: Record<string, DhalRateLimitConfig>;
    };
    rules: DhalRuleConfig;
    routes: Record<string, DhalRouteProfile>;
    policy: DhalPolicyConfig;
    observability: {
        correlation: {
            headers: string[];
        };
        logs: {
            enabled: boolean;
            format: "json" | "pretty";
        };
        events: {
            enabled: boolean;
        };
        otel: {
            enabled: boolean;
            serviceName: string;
            emitAllowedRequests: boolean;
        };
        webhooks: {
            enabled: boolean;
            urls: string[];
            timeoutMs: number;
            emitAllowedRequests: boolean;
            signing: {
                enabled: boolean;
                secretEnv: string;
                signatureHeader: string;
                timestampHeader: string;
                idHeader: string;
            };
        };
    };
    response: {
        blockStatusCode: number;
        message: string;
    };
};
type DhalOptions = {
    config?: PartialDeep<DhalConfig> | undefined;
    configPath?: string | undefined;
    logger?: Pick<Console, "log" | "warn" | "error"> | undefined;
    rateLimitStore?: RateLimitStore | undefined;
    signalStore?: DhalSignalStore | undefined;
    ipReputationProvider?: IpReputationProvider | undefined;
    telemetry?: DhalTelemetry | undefined;
};
type DhalAutosetupProvider = "gateway" | "openai" | "anthropic" | "google" | "mistral" | "xai" | "custom";
type DhalAutosetupOptions = {
    projectRoot: string;
    configPath: string;
    provider: DhalAutosetupProvider;
    model: string;
    write: boolean;
    useAi: boolean;
    maxFiles: number;
    maxBytesPerFile: number;
    providerModule?: string | undefined;
    providerExport?: string | undefined;
    outputPath?: string | undefined;
};
type DhalSecurityEvent = {
    eventId: string;
    timestamp: string;
    correlationId?: string | undefined;
    request: Pick<DhalRequest, "method" | "path" | "ip" | "route" | "userId" | "tenantId" | "apiKeyId"> & {
        userAgent?: string | undefined;
    };
    decision: DhalDecision;
    ruleCategory: string;
    threatKind?: string | undefined;
    severity: DhalSeverity;
    audit?: DhalAuditExplanation | undefined;
    durationMs: number;
};
type DhalAuditExplanation = {
    ruleId?: string | undefined;
    ruleCategory: string;
    severity: DhalSeverity;
    reason: string;
    action: DhalAction;
    wouldBlock: boolean;
    suppressed: boolean;
    suppressionId?: string | undefined;
    routePattern?: string | undefined;
    routeTags?: string[] | undefined;
    matchedSignals?: unknown[] | undefined;
};
type DhalResponseOutcome = {
    statusCode: number;
};
type DhalSecuritySignal = {
    timestamp: string;
    kind: "credential_failure";
    key: string;
    request: Pick<DhalRequest, "method" | "path" | "ip" | "route" | "userId" | "tenantId" | "apiKeyId">;
    meta?: Record<string, unknown> | undefined;
};
interface RateLimitStore {
    consume(key: string, limit: DhalRateLimitConfig): Promise<{
        allowed: boolean;
        remaining: number;
        resetAt: number;
    }>;
}
interface DhalSignalStore {
    record(key: string, windowSeconds: number): Promise<{
        count: number;
        resetAt: number;
    }>;
    count(key: string): Promise<{
        count: number;
        resetAt: number;
    }>;
}
type IpReputationResult = {
    ip: string;
    provider: string;
    score: number;
    totalReports?: number | undefined;
    countryCode?: string | undefined;
    usageType?: string | undefined;
    isp?: string | undefined;
    domain?: string | undefined;
    checkedAt: number;
    expiresAt: number;
    raw?: unknown | undefined;
};
interface IpReputationProvider {
    readonly name: string;
    check(ip: string): Promise<IpReputationResult>;
}
interface DhalTelemetry {
    recordDecision(event: DhalSecurityEvent): void;
}
type PartialDeep<T> = {
    [P in keyof T]?: T[P] extends Array<infer U> ? Array<U> : T[P] extends object ? PartialDeep<T[P]> : T[P];
};

export type { DhalSecuritySignal as A, DhalSeverity as B, DhalSignalStore as C, DhalAction as D, DhalTelemetry as E, IpReputationResult as F, IpReputationProvider as I, PartialDeep as P, RateLimitStore as R, DhalApiPositiveSecurityConfig as a, DhalAuditExplanation as b, DhalAutosetupOptions as c, DhalAutosetupProvider as d, DhalBotRuleConfig as e, DhalConfig as f, DhalContentTypeConfig as g, DhalCredentialStuffingKey as h, DhalCredentialStuffingRuleConfig as i, DhalDecision as j, DhalHeaderAnomalyConfig as k, DhalHeaders as l, DhalHoneypotRuleConfig as m, DhalIdentityKey as n, DhalMode as o, DhalOptions as p, DhalPolicyConfig as q, DhalRateLimitConfig as r, DhalRequest as s, DhalResponseOutcome as t, DhalRouteProfile as u, DhalRuleConfig as v, DhalRulePackName as w, DhalRuleSuppression as x, DhalSamplingConfig as y, DhalSecurityEvent as z };
