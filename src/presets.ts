import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deepMerge, defaultConfig, loadDhalConfig } from "./config.js";
import type { DhalConfig, PartialDeep } from "./types.js";

export type DhalPresetName =
  | "starter"
  | "api-production"
  | "auth-hardened"
  | "strict-json-api"
  | "behind-proxy"
  | "observability";

export type DhalPreset = {
  name: DhalPresetName;
  title: string;
  description: string;
  intendedFor: string[];
  notes: string[];
  config: PartialDeep<DhalConfig>;
};

export type DhalPresetSummary = Omit<DhalPreset, "config">;

export const DHAL_PRESETS: Record<DhalPresetName, DhalPreset> = {
  starter: {
    name: "starter",
    title: "Starter monitor-mode policy",
    description: "Safe default policy for first installs. Detects and logs security decisions without blocking by default.",
    intendedFor: ["local setup", "first production dry-run", "new Dhal installations"],
    notes: [
      "Starts in monitor mode so teams can review would-block events before enforcement.",
      "Uses the in-memory rate-limit store; switch to Redis/Valkey for multi-instance production.",
      "Keeps IP reputation, webhooks, and OTel disabled until credentials/endpoints are configured."
    ],
    config: {
      mode: "monitor",
      trustProxy: false,
      rateLimit: {
        enabled: true,
        store: "memory",
        keyBy: ["ip", "route"],
        default: { windowSeconds: 60, max: 120 }
      },
      rules: {
        packs: ["generic-web", "api"],
        api: { enabled: false },
        bot: { enabled: true },
        honeypot: { enabled: true },
        credentialStuffing: { enabled: true }
      }
    }
  },
  "api-production": {
    name: "api-production",
    title: "Production API baseline",
    description: "Production-oriented baseline for JSON APIs running behind a trusted proxy/CDN with Redis/Valkey available.",
    intendedFor: ["REST APIs", "SaaS APIs", "multi-instance Node deployments"],
    notes: [
      "Assumes a trusted proxy/CDN provides forwarding headers; validate your edge before enabling trustProxy.",
      "Uses Redis/Valkey for distributed rate limiting but does not create the Redis client for you.",
      "Keeps global mode monitor while enforcing high-confidence login and private API route profiles."
    ],
    config: {
      mode: "monitor",
      trustProxy: true,
      rateLimit: {
        enabled: true,
        store: "redis",
        keyBy: ["ip", "route"],
        default: { windowSeconds: 60, max: 300 }
      },
      rules: {
        packs: ["generic-web", "api", "auth"],
        api: { enabled: true, requireJsonContentType: true, maxJsonDepth: 24, maxJsonKeys: 800 },
        headers: { enabled: true, blockConflictingForwardingHeaders: true },
        contentType: { enabled: true, blockMissingOnBodyMethods: true, blockJsonMismatch: true },
        bot: {
          enabled: true,
          scoreThreshold: 75,
          falsePositiveControls: {
            minSignals: 2,
            skipStaticAssets: true,
            ignorePaths: ["/healthz", "/health", "/readyz", "/favicon.ico"],
            ignorePrivateIps: true
          }
        },
        credentialStuffing: { enabled: true, maxFailures: 6, windowSeconds: 300, keyBy: ["ip", "route", "userAgent"] }
      },
      routes: {
        "/api/login": {
          mode: "block",
          tags: ["auth", "login"],
          rateLimit: { enabled: true, windowSeconds: 60, max: 10, keyBy: ["ip", "route"] },
          rules: {
            credentialStuffing: { enabled: true, maxFailures: 5, windowSeconds: 300, keyBy: ["ip", "route", "userAgent"] },
            bot: { enabled: true }
          },
          response: { blockStatusCode: 429, message: "Too many login attempts" }
        },
        "/api/private/*": {
          mode: "block",
          tags: ["api", "private"],
          rateLimit: { enabled: true, windowSeconds: 60, max: 120, keyBy: ["tenantId", "apiKeyId", "route"] },
          rules: {
            api: { enabled: true },
            contentType: { enabled: true }
          }
        }
      },
      observability: {
        otel: { enabled: true, serviceName: "dhal-protected-api", emitAllowedRequests: false },
        webhooks: {
          enabled: false,
          signing: { enabled: true, secretEnv: "DHAL_WEBHOOK_SECRET" }
        }
      },
      policy: {
        ci: {
          failOnModes: ["off"],
          requireWebhookSigning: true,
          requireNonMonitorRouteForRules: ["credential_stuffing.threshold_exceeded", "rate_limit.exceeded"],
          disallowExpiredSuppressions: true
        }
      }
    }
  },
  "auth-hardened": {
    name: "auth-hardened",
    title: "Auth and credential-stuffing hardening",
    description: "Route profiles and behavior controls for login, session, and authentication surfaces.",
    intendedFor: ["login APIs", "session endpoints", "password flows", "admin auth"],
    notes: [
      "Blocks high-confidence login abuse while leaving the rest of the app in monitor mode.",
      "Uses response-outcome learning from 401/403/400 responses.",
      "Tune keyBy to match your auth model; API-key and tenant-aware apps should include apiKeyId/tenantId."
    ],
    config: {
      mode: "monitor",
      rules: {
        packs: ["generic-web", "auth"],
        credentialStuffing: {
          enabled: true,
          loginPathPatterns: ["/api/login", "/login", "/auth/login", "/api/auth/*"],
          failureStatusCodes: [400, 401, 403],
          windowSeconds: 300,
          maxFailures: 5,
          keyBy: ["ip", "route", "userAgent"]
        },
        bot: { enabled: true, scoreThreshold: 70 },
        honeypot: { enabled: true }
      },
      routes: {
        "/api/login": {
          mode: "block",
          tags: ["auth", "login"],
          rateLimit: { enabled: true, windowSeconds: 60, max: 8, keyBy: ["ip", "route"] },
          response: { blockStatusCode: 429, message: "Too many login attempts" }
        },
        "/auth/*": {
          mode: "block",
          tags: ["auth"],
          rateLimit: { enabled: true, windowSeconds: 60, max: 30, keyBy: ["ip", "route"] }
        }
      }
    }
  },
  "strict-json-api": {
    name: "strict-json-api",
    title: "Strict JSON API policy",
    description: "Tighter positive-security policy for APIs that should only receive JSON request bodies.",
    intendedFor: ["internal APIs", "machine-to-machine APIs", "strict JSON services"],
    notes: [
      "Enables positive security checks for methods with bodies.",
      "Can create false positives for multipart uploads or form endpoints; add route-specific exceptions before block mode.",
      "Best paired with replay fixtures before broad production enforcement."
    ],
    config: {
      mode: "monitor",
      rules: {
        packs: ["generic-web", "api", "strict-api"],
        api: {
          enabled: true,
          requireJsonContentType: true,
          allowedContentTypes: ["application/json", "application/problem+json", "application/ld+json"],
          methodsWithBody: ["POST", "PUT", "PATCH"],
          maxJsonDepth: 18,
          maxJsonKeys: 500
        },
        contentType: {
          enabled: true,
          blockMissingOnBodyMethods: true,
          blockJsonMismatch: true,
          allowedJsonMimeTypes: ["application/json", "application/problem+json", "application/ld+json"]
        },
        headers: { enabled: true, maxHeaderCount: 80, maxHeaderBytes: 12288 }
      },
      routes: {
        "/api/*": {
          mode: "block",
          tags: ["api", "json"],
          rules: {
            api: { enabled: true },
            contentType: { enabled: true },
            headers: { enabled: true }
          }
        },
        "/api/upload": {
          mode: "monitor",
          tags: ["api", "upload", "review-required"],
          rules: {
            api: { enabled: false },
            contentType: { blockMissingOnBodyMethods: false }
          }
        }
      }
    }
  },
  "behind-proxy": {
    name: "behind-proxy",
    title: "Trusted proxy/CDN deployment",
    description: "Baseline for apps running behind a correctly configured CDN, ingress, reverse proxy, or load balancer.",
    intendedFor: ["Cloudflare", "AWS ALB", "nginx", "Envoy", "Kubernetes ingress"],
    notes: [
      "Only enable trustProxy when all direct origin traffic is blocked or forwarding headers are controlled.",
      "Turns on conflicting forwarding-header detection to reduce spoofing risk.",
      "Keeps enforcement in monitor mode until your deployment topology is verified."
    ],
    config: {
      mode: "monitor",
      trustProxy: true,
      rules: {
        headers: {
          enabled: true,
          requireHostHeader: true,
          maxHeaderCount: 96,
          maxHeaderBytes: 16384,
          blockConflictingForwardingHeaders: true,
          suspiciousHeaders: ["x-forwarded-host", "x-original-url", "x-rewrite-url", "x-real-ip"]
        },
        bot: {
          falsePositiveControls: {
            minSignals: 2,
            skipStaticAssets: true,
            ignorePaths: ["/healthz", "/health", "/readyz", "/favicon.ico"],
            ignorePrivateIps: true
          }
        }
      }
    }
  },
  observability: {
    name: "observability",
    title: "Telemetry and signed alerts",
    description: "Enables OpenTelemetry and signed webhook-ready event settings without changing enforcement mode.",
    intendedFor: ["SIEM pipelines", "incident workflows", "Anubase security dashboards", "OTel collectors"],
    notes: [
      "Webhook targets stay empty by default; add URLs in dhal.json or through deployment templating.",
      "Signing is enabled and expects DHAL_WEBHOOK_SECRET at runtime.",
      "Allowed-request emission remains off to keep telemetry volume controlled."
    ],
    config: {
      observability: {
        logs: { enabled: true, format: "json" },
        events: { enabled: true },
        otel: { enabled: true, serviceName: "dhal-protected-app", emitAllowedRequests: false },
        webhooks: {
          enabled: true,
          urls: [],
          emitAllowedRequests: false,
          signing: {
            enabled: true,
            secretEnv: "DHAL_WEBHOOK_SECRET",
            signatureHeader: "x-dhal-signature",
            timestampHeader: "x-dhal-timestamp",
            idHeader: "x-dhal-event-id"
          }
        }
      }
    }
  }
};

export function listDhalPresets(): DhalPresetSummary[] {
  return Object.values(DHAL_PRESETS).map(({ config: _config, ...summary }) => summary);
}

export function getDhalPreset(name: string): DhalPreset {
  if (!isPresetName(name)) {
    throw new Error(`Unknown Dhal preset: ${name}. Run \`dhal presets\` to list available presets.`);
  }
  return DHAL_PRESETS[name];
}

export function applyDhalPreset(config: DhalConfig | PartialDeep<DhalConfig>, presetName: string): DhalConfig {
  const preset = getDhalPreset(presetName);
  return deepMerge(defaultConfig, config, preset.config) as DhalConfig;
}

export function loadConfigForPresetApply(configPath = "dhal.json"): DhalConfig {
  const resolvedPath = resolve(process.cwd(), configPath);
  if (existsSync(resolvedPath)) return loadDhalConfig(resolvedPath);
  return loadDhalConfig("__dhal_missing_config_for_preset__.json");
}

export function readConfigIfExists(configPath = "dhal.json"): PartialDeep<DhalConfig> {
  const resolvedPath = resolve(process.cwd(), configPath);
  if (!existsSync(resolvedPath)) return {};
  return JSON.parse(readFileSync(resolvedPath, "utf8")) as PartialDeep<DhalConfig>;
}

function isPresetName(name: string): name is DhalPresetName {
  return Object.prototype.hasOwnProperty.call(DHAL_PRESETS, name);
}
