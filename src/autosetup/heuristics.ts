import { defaultConfig, deepMerge } from "../config.js";
import type { DhalConfig, PartialDeep } from "../types.js";
import type { ProjectScan } from "./scanner.js";

export type AutosetupProposal = {
  config: PartialDeep<DhalConfig>;
  rationale: string[];
  warnings: string[];
};

export function buildHeuristicProposal(scan: ProjectScan): AutosetupProposal {
  const routes: DhalConfig["routes"] = {};
  const rationale: string[] = [];
  const warnings: string[] = [];
  const packs = new Set<DhalConfig["rules"]["packs"][number]>(["generic-web", "api"]);

  if (scan.frameworkHints.length === 0) {
    warnings.push("No supported Node web framework was confidently detected; generated config is conservative.");
  }

  if (scan.routes.some((route) => route.risk.includes("auth"))) {
    packs.add("auth");
    rationale.push("Detected auth/login routes; enabling auth rule pack and credential-stuffing profiles.");
  }

  if (scan.routes.some((route) => route.risk.includes("graphql"))) {
    rationale.push("Detected GraphQL-like routes; API rule pack will include GraphQL introspection probes.");
  }

  for (const route of scan.routes) {
    const path = normalizeRoutePattern(route.path);
    const risk = new Set(route.risk);

    if (risk.has("auth")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "block",
        tags: ["autosetup", "auth"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 8, keyBy: ["ip", "route"] },
        rules: {
          credentialStuffing: {
            enabled: true,
            loginPathPatterns: [path],
            windowSeconds: 300,
            maxFailures: 6,
            keyBy: ["ip", "route", "userAgent"]
          },
          bot: { enabled: true, scoreThreshold: 65 }
        }
      });
      rationale.push(`Added strict auth protection for ${path}.`);
    }

    if (risk.has("admin")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "block",
        tags: ["autosetup", "admin"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 30, keyBy: ["ip", "route"] },
        rules: { bot: { enabled: true, scoreThreshold: 60 } }
      });
      rationale.push(`Added lower bot threshold and tighter rate limits for admin route ${path}.`);
    }

    if (risk.has("upload")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "block",
        tags: ["autosetup", "upload"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 20, keyBy: ["ip", "route"] },
        rules: {
          largePayload: { enabled: true, maxBytes: 5 * 1024 * 1024 },
          api: { enabled: false }
        }
      });
      rationale.push(`Added upload-specific payload and rate-limit controls for ${path}.`);
    }

    if (risk.has("payments-or-webhooks")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "block",
        tags: ["autosetup", "webhook-or-payment"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 120, keyBy: ["ip", "route"] },
        rules: {
          contentType: { enabled: true, blockJsonMismatch: true },
          bot: { enabled: true, scoreThreshold: 80 }
        }
      });
      warnings.push(`Route ${path} looks like a webhook/payment route; Dhal can rate-limit and inspect it, but provider signature verification must stay in application code.`);
    }

    if (risk.has("graphql")) {
      routes[path] = mergeRouteProfile(routes[path], {
        mode: "monitor",
        tags: ["autosetup", "graphql"],
        rateLimit: { enabled: true, windowSeconds: 60, max: 60, keyBy: ["ip", "route"] },
        rules: {
          api: { enabled: true, maxJsonDepth: 12, maxJsonKeys: 250 }
        }
      });
      rationale.push(`Added GraphQL-oriented JSON depth/key limits for ${path}.`);
    }
  }

  const proposal: PartialDeep<DhalConfig> = {
    mode: "monitor",
    trustProxy: inferTrustProxy(scan),
    rules: {
      packs: [...packs],
      api: {
        enabled: scan.frameworkHints.includes("next") || scan.routes.some((route) => route.path.startsWith("/api")),
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
        suspiciousHeaders: ["x-original-url", "x-rewrite-url", "x-forwarded-host"],
        blockConflictingForwardingHeaders: false
      },
      contentType: {
        enabled: true,
        blockMissingOnBodyMethods: false,
        blockJsonMismatch: true,
        allowedJsonMimeTypes: ["application/json", "application/problem+json", "application/ld+json"]
      },
      credentialStuffing: {
        enabled: scan.routes.some((route) => route.risk.includes("auth")),
        loginPathPatterns: scan.routes.filter((route) => route.risk.includes("auth")).map((route) => normalizeRoutePattern(route.path)).slice(0, 20)
      }
    },
    routes,
    policy: {
      audit: { enabled: true, includeSuppressed: true }
    }
  };

  if (Object.keys(routes).length === 0) {
    rationale.push("No explicit route profile was needed; global monitor-mode controls remain enabled.");
  }

  return {
    config: deepMerge(defaultConfig, proposal) as PartialDeep<DhalConfig>,
    rationale,
    warnings
  };
}

function inferTrustProxy(scan: ProjectScan): boolean {
  return scan.packageHints.some((name) => ["next", "@vercel/node", "serverless-http"].includes(name));
}

function normalizeRoutePattern(path: string): string {
  return path.replace(/:([^/]+)/g, "*").replace(/\*[^/]*/g, "*");
}


function mergeRouteProfile(current: DhalConfig["routes"][string] | undefined, patch: DhalConfig["routes"][string]): DhalConfig["routes"][string] {
  return deepMerge((current ?? {}) as Record<string, unknown>, patch as Record<string, unknown>) as DhalConfig["routes"][string];
}
