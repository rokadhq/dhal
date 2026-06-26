import { DHAL_PACKAGE_VERSION, DHAL_RELEASE_CHANNEL } from "./compatibility.js";

export type DhalApiStabilityLevel = "stable-for-v1" | "beta-stabilizing" | "experimental" | "internal";

export type DhalApiSurface = {
  name: string;
  importPath?: string | undefined;
  level: DhalApiStabilityLevel;
  notes: string;
};

export type DhalStabilityReport = {
  packageName: "@rokadhq/dhal";
  version: string;
  releaseChannel: string;
  surfaces: DhalApiSurface[];
};

export const DHAL_API_SURFACES: DhalApiSurface[] = [
  { name: "Core engine", importPath: "@rokadhq/dhal", level: "stable-for-v1", notes: "createDhal, loadDhalConfig, config schema export, and core types are intended to remain stable for v1." },
  { name: "Express adapter", importPath: "@rokadhq/dhal/express", level: "stable-for-v1", notes: "The Express middleware API is v1-bound." },
  { name: "Fastify adapter", importPath: "@rokadhq/dhal/fastify", level: "stable-for-v1", notes: "The Fastify plugin API is v1-bound." },
  { name: "Node HTTP adapter", importPath: "@rokadhq/dhal/node-http", level: "stable-for-v1", notes: "The raw node:http handler API is v1-bound." },
  { name: "dhal.json schemaVersion 1", importPath: "./dhal.schema.json", level: "stable-for-v1", notes: "The schemaVersion 1 configuration model is the v1 contract target." },
  { name: "CLI diagnostics", level: "stable-for-v1", notes: "doctor, readiness, compat, report, rules, schema, migrate, presets, replay, simulate, and ci are v1-bound command names." },
  { name: "Redis / Valkey stores", importPath: "@rokadhq/dhal/stores/redis", level: "beta-stabilizing", notes: "Store contracts are expected to remain stable but should get real multi-instance validation before v1." },
  { name: "Telemetry adapters", importPath: "@rokadhq/dhal/telemetry/otel", level: "beta-stabilizing", notes: "Public integration path is v1-bound; emitted attributes may still be refined." },
  { name: "AI autosetup", importPath: "@rokadhq/dhal/autosetup", level: "experimental", notes: "Autosetup generates reviewable config proposals and may evolve before v1." },
  { name: "Internal rule scoring", level: "internal", notes: "Rule internals and scoring weights are not public API." }
];

export function getDhalApiStabilityReport(): DhalStabilityReport {
  return {
    packageName: "@rokadhq/dhal",
    version: DHAL_PACKAGE_VERSION,
    releaseChannel: DHAL_RELEASE_CHANNEL,
    surfaces: DHAL_API_SURFACES
  };
}
