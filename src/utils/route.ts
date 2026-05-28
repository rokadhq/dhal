import { deepMerge } from "../config.js";
import type { DhalConfig, DhalRateLimitConfig, DhalRouteProfile, PartialDeep } from "../types.js";

export type MatchedRouteProfile = {
  pattern: string;
  profile: DhalRouteProfile;
};

export type RouteSecurityContext = {
  config: DhalConfig;
  routePattern: string;
  routeProfile?: DhalRouteProfile | undefined;
};

export function createRouteSecurityContext(config: DhalConfig, path: string): RouteSecurityContext {
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

export function pickRouteProfile(config: DhalConfig, path: string): MatchedRouteProfile | undefined {
  let best: { pattern: string; profile: DhalRouteProfile; score: number } | undefined;

  for (const [pattern, profile] of Object.entries(config.routes)) {
    if (matchesRoutePattern(path, pattern)) {
      const score = routeSpecificityScore(pattern);
      if (!best || score > best.score) {
        best = { pattern, profile, score };
      }
    }
  }

  return best ? { pattern: best.pattern, profile: best.profile } : undefined;
}

export function pickRouteLimit(config: DhalConfig, path: string): {
  pattern: string;
  limit: DhalRateLimitConfig;
} {
  let best: { pattern: string; limit: DhalRateLimitConfig; score: number } | undefined;

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

export function matchesRoutePattern(path: string, pattern: string): boolean {
  if (pattern === path) return true;
  if (!pattern.includes("*")) return false;

  const regex = new RegExp(`^${escapeRegex(pattern).replaceAll("\\*", ".*")}$`);
  return regex.test(path);
}

function applyRouteProfile(config: DhalConfig, pattern: string, profile: DhalRouteProfile): DhalConfig {
  const patch: PartialDeep<DhalConfig> = {};

  if (profile.mode) {
    patch.mode = profile.mode;
  }

  if (profile.rules) {
    patch.rules = profile.rules as PartialDeep<DhalConfig["rules"]>;
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

  return deepMerge(config, patch) as DhalConfig;
}

function routeSpecificityScore(pattern: string): number {
  return pattern.replaceAll("*", "").length;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
