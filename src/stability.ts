import { DHAL_PACKAGE_VERSION, DHAL_RELEASE_CHANNEL } from "./compatibility.js";

export type DhalApiStabilityLevel = "stable" | "release-candidate" | "experimental" | "internal";

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
  { name: "Core engine", importPath: "@rokadhq/dhal", level: "stable", notes: "createDhal, loadDhalConfig, schema exports, release checks, and core public types are frozen for v1." },
  { name: "Express adapter", importPath: "@rokadhq/dhal/express", level: "stable", notes: "Express 4 and 5 integration behavior is part of the v1 contract." },
  { name: "Fastify adapter", importPath: "@rokadhq/dhal/fastify", level: "stable", notes: "Fastify 4 and 5 registration and enforcement behavior is part of the v1 contract." },
  { name: "Node HTTP adapter", importPath: "@rokadhq/dhal/node-http", level: "stable", notes: "The raw node:http handler API is part of the v1 contract." },
  { name: "NestJS bootstrap adapter", importPath: "@rokadhq/dhal", level: "stable", notes: "installDhalNest and installDhalNestFromEngine support NestJS HTTP applications using Express or Fastify." },
  { name: "Koa adapter", importPath: "@rokadhq/dhal", level: "stable", notes: "dhalKoa and dhalKoaFromEngine provide Koa-compatible request inspection and response-outcome recording." },
  { name: "Hono adapter", importPath: "@rokadhq/dhal", level: "stable", notes: "dhalHono and dhalHonoFromEngine provide Web Request/Response based middleware for Hono on Node.js." },
  { name: "dhal.json schemaVersion 1", importPath: "./dhal.schema.json", level: "stable", notes: "schemaVersion 1 remains backward compatible throughout v1.x." },
  { name: "CLI contract", level: "stable", notes: "The command inventory declared by @rokadhq/dhal/v1-contract remains available throughout v1.x." },
  { name: "Redis / Valkey stores", importPath: "@rokadhq/dhal/stores/redis", level: "stable", notes: "Redis 7 and Valkey 8 multi-instance behavior is covered by the v1 release gate." },
  { name: "Webhook telemetry", importPath: "@rokadhq/dhal/telemetry/webhook", level: "stable", notes: "Signed webhook payload and metadata behavior is part of the v1 contract." },
  { name: "OpenTelemetry adapter", importPath: "@rokadhq/dhal/telemetry/otel", level: "stable", notes: "The adapter API and existing emitted attributes are part of the stable v1 contract; additive attributes may be introduced in minor releases." },
  { name: "AI autosetup", importPath: "@rokadhq/dhal/autosetup", level: "experimental", notes: "Autosetup produces reviewable proposals and remains outside the stable v1 contract." },
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
