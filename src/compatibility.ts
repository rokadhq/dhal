export type DhalCompatibilityStatus = "supported" | "tested" | "optional" | "experimental";

export type DhalCompatibilityTarget = {
  name: string;
  range: string;
  status: DhalCompatibilityStatus;
  notes: string;
};

export type DhalCompatibilityMatrix = {
  packageName: "@rokadhq/dhal";
  version: string;
  releaseChannel: "alpha" | "beta" | "rc" | "next" | "latest";
  node: DhalCompatibilityTarget[];
  frameworks: DhalCompatibilityTarget[];
  integrations: DhalCompatibilityTarget[];
  packageManagers: DhalCompatibilityTarget[];
  stability: {
    publicApi: "beta-stabilizing";
    configSchema: "beta-stabilizing";
    cli: "beta-stabilizing";
    note: string;
  };
};

export const DHAL_PACKAGE_VERSION = "0.13.0-beta.1";
export const DHAL_RELEASE_CHANNEL = "beta" as const;

export const DHAL_COMPATIBILITY_MATRIX: DhalCompatibilityMatrix = {
  packageName: "@rokadhq/dhal",
  version: DHAL_PACKAGE_VERSION,
  releaseChannel: DHAL_RELEASE_CHANNEL,
  node: [
    {
      name: "Node.js",
      range: ">=18.18.0",
      status: "supported",
      notes: "Minimum supported runtime for published package execution."
    },
    {
      name: "Node.js 20 LTS",
      range: ">=20.0.0",
      status: "tested",
      notes: "Recommended production baseline for long-term support deployments."
    },
    {
      name: "Node.js 22/24",
      range: ">=22.0.0",
      status: "tested",
      notes: "Used by Dhal release workflows and publish verification."
    }
  ],
  frameworks: [
    {
      name: "Express",
      range: ">=4.18.0 || >=5.0.0",
      status: "supported",
      notes: "Use @rokadhq/dhal/express."
    },
    {
      name: "Fastify",
      range: ">=4.0.0 || >=5.0.0",
      status: "supported",
      notes: "Use @rokadhq/dhal/fastify."
    },
    {
      name: "node:http",
      range: "Node built-in",
      status: "supported",
      notes: "Use @rokadhq/dhal/node-http."
    },
    {
      name: "NestJS",
      range: "Express/Fastify adapters",
      status: "optional",
      notes: "Integrate through the underlying Express or Fastify adapter."
    }
  ],
  integrations: [
    {
      name: "Redis / Valkey",
      range: "ioredis >=5.0.0 compatible client",
      status: "supported",
      notes: "Use distributed stores for multi-instance production deployments."
    },
    {
      name: "OpenTelemetry API",
      range: ">=1.8.0",
      status: "optional",
      notes: "Use @rokadhq/dhal/telemetry/otel when OTel is already configured in the app."
    },
    {
      name: "AbuseIPDB-style reputation",
      range: "API key configured by environment variable",
      status: "optional",
      notes: "Use cache-first behavior and prefer async mode on public APIs."
    },
    {
      name: "AI SDK autosetup",
      range: "ai >=5.0.0 plus optional provider packages",
      status: "experimental",
      notes: "Generates proposed config; review before enforcing."
    },
    {
      name: "GitHub Actions publishing",
      range: "npm Trusted Publishing or token fallback",
      status: "supported",
      notes: "npmjs publishing is primary; GitHub Packages publishing is optional."
    }
  ],
  packageManagers: [
    {
      name: "npm",
      range: ">=10",
      status: "tested",
      notes: "Primary supported package manager and release workflow."
    },
    {
      name: "pnpm / yarn / bun",
      range: "modern versions",
      status: "optional",
      notes: "Expected to work for package consumption; release verification currently uses npm."
    }
  ],
  stability: {
    publicApi: "beta-stabilizing",
    configSchema: "beta-stabilizing",
    cli: "beta-stabilizing",
    note: "Dhal v0.13 introduces schemaVersion 1 and migration checks as the v1-bound configuration contract. Avoid breaking public imports, config keys, and CLI names unless a migration path is provided."
  }
};

export function getDhalCompatibilityMatrix(): DhalCompatibilityMatrix {
  return DHAL_COMPATIBILITY_MATRIX;
}
