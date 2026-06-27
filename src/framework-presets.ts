import { deepMerge, defaultConfig } from "./config.js";
import type { DhalConfig, PartialDeep } from "./types.js";

export type DhalFrameworkPresetName =
  | "express-api"
  | "fastify-api"
  | "nestjs-api"
  | "koa-api"
  | "hono-node-api"
  | "node-http-api";

export type DhalFrameworkPreset = {
  name: DhalFrameworkPresetName;
  title: string;
  description: string;
  framework: "express" | "fastify" | "nestjs" | "koa" | "hono" | "node-http";
  intendedFor: string[];
  notes: string[];
  config: PartialDeep<DhalConfig>;
};

export type DhalFrameworkPresetSummary = Omit<DhalFrameworkPreset, "config">;

const baseApiConfig: PartialDeep<DhalConfig> = {
  mode: "monitor",
  trustProxy: false,
  runtime: {
    onInternalError: "allow",
    bypass: {
      enabled: true,
      paths: ["/health", "/healthz", "/ready", "/readyz"],
      methods: ["OPTIONS"]
    }
  },
  rateLimit: {
    enabled: true,
    store: "memory",
    keyBy: ["ip", "route"],
    default: { windowSeconds: 60, max: 120 }
  },
  rules: {
    packs: ["generic-web", "api", "auth"],
    api: { enabled: true, requireJsonContentType: false },
    headers: { enabled: true },
    contentType: { enabled: true, blockMissingOnBodyMethods: false },
    bot: { enabled: true },
    honeypot: { enabled: true },
    credentialStuffing: { enabled: true }
  },
  routes: {
    "/api/login": {
      mode: "monitor",
      tags: ["auth", "login", "review-before-block"],
      rateLimit: { enabled: true, windowSeconds: 60, max: 10, keyBy: ["ip", "route"] },
      rules: {
        credentialStuffing: {
          enabled: true,
          windowSeconds: 300,
          maxFailures: 5,
          keyBy: ["ip", "route", "userAgent"]
        }
      }
    }
  }
};

export const DHAL_FRAMEWORK_PRESETS: Record<DhalFrameworkPresetName, DhalFrameworkPreset> = {
  "express-api": frameworkPreset(
    "express-api",
    "express",
    "Express API monitor baseline",
    "Safe first-install policy for Express APIs using the Dhal middleware adapter.",
    ["Express 4", "Express 5", "REST APIs"]
  ),
  "fastify-api": frameworkPreset(
    "fastify-api",
    "fastify",
    "Fastify API monitor baseline",
    "Safe first-install policy for Fastify APIs using the Dhal plugin adapter.",
    ["Fastify 4", "Fastify 5", "REST APIs"]
  ),
  "nestjs-api": frameworkPreset(
    "nestjs-api",
    "nestjs",
    "NestJS API monitor baseline",
    "Safe first-install policy for NestJS HTTP applications on Express or Fastify.",
    ["NestJS", "Nest Express", "Nest Fastify"]
  ),
  "koa-api": frameworkPreset(
    "koa-api",
    "koa",
    "Koa API monitor baseline",
    "Safe first-install policy for Koa middleware applications.",
    ["Koa", "Koa Router", "REST APIs"]
  ),
  "hono-node-api": frameworkPreset(
    "hono-node-api",
    "hono",
    "Hono Node API monitor baseline",
    "Safe first-install policy for Hono applications running on Node.js.",
    ["Hono", "@hono/node-server", "Web standard Request/Response APIs"]
  ),
  "node-http-api": frameworkPreset(
    "node-http-api",
    "node-http",
    "Raw node:http monitor baseline",
    "Safe first-install policy for applications using the built-in node:http server.",
    ["node:http", "custom Node.js servers"]
  )
};

export function listDhalFrameworkPresets(): DhalFrameworkPresetSummary[] {
  return Object.values(DHAL_FRAMEWORK_PRESETS).map(({ config: _config, ...summary }) => summary);
}

export function getDhalFrameworkPreset(name: string): DhalFrameworkPreset {
  if (!isFrameworkPresetName(name)) {
    throw new Error(`Unknown Dhal framework preset: ${name}.`);
  }
  return DHAL_FRAMEWORK_PRESETS[name];
}

export function applyDhalFrameworkPreset(
  config: DhalConfig | PartialDeep<DhalConfig>,
  presetName: string
): DhalConfig {
  const preset = getDhalFrameworkPreset(presetName);
  return deepMerge(defaultConfig, config, preset.config) as DhalConfig;
}

export function isFrameworkPresetName(name: string): name is DhalFrameworkPresetName {
  return Object.prototype.hasOwnProperty.call(DHAL_FRAMEWORK_PRESETS, name);
}

function frameworkPreset(
  name: DhalFrameworkPresetName,
  framework: DhalFrameworkPreset["framework"],
  title: string,
  description: string,
  intendedFor: string[]
): DhalFrameworkPreset {
  return {
    name,
    framework,
    title,
    description,
    intendedFor,
    notes: [
      "Global and route modes remain monitor until the application owner promotes reviewed routes.",
      "The in-memory rate-limit store is for single-instance onboarding; use Redis or Valkey when horizontally scaled.",
      "Health and readiness paths plus OPTIONS requests are bypassed by default."
    ],
    config: baseApiConfig
  };
}
