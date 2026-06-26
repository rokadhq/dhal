import packageMetadata from "../package.json";

export type DhalCompatibilityStatus = "supported" | "tested" | "optional" | "experimental";
export type DhalContractStability = "experimental" | "beta-stabilizing" | "release-candidate" | "stable";

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
    publicApi: DhalContractStability;
    configSchema: DhalContractStability;
    cli: DhalContractStability;
    note: string;
  };
};

export const DHAL_PACKAGE_VERSION = packageMetadata.version;
export const DHAL_RELEASE_CHANNEL = "latest" as const;

export const DHAL_COMPATIBILITY_MATRIX: DhalCompatibilityMatrix = {
  packageName: "@rokadhq/dhal",
  version: DHAL_PACKAGE_VERSION,
  releaseChannel: DHAL_RELEASE_CHANNEL,
  node: [
    {
      name: "Node.js",
      range: ">=20.0.0",
      status: "supported",
      notes: "Minimum runtime for the Dhal v1 line."
    },
    {
      name: "Node.js 20",
      range: ">=20.0.0 <22.0.0",
      status: "tested",
      notes: "Compatibility baseline for existing production deployments."
    },
    {
      name: "Node.js 22/24",
      range: ">=22.0.0",
      status: "tested",
      notes: "Primary runtime matrix for v1 verification and release workflows."
    }
  ],
  frameworks: [
    {
      name: "Express",
      range: ">=4.18.0 || >=5.0.0",
      status: "supported",
      notes: "Express 4 and 5 are exercised by the v1 adapter matrix."
    },
    {
      name: "Fastify",
      range: ">=4.0.0 || >=5.0.0",
      status: "supported",
      notes: "Fastify 4 and 5 are exercised by the v1 adapter matrix."
    },
    {
      name: "node:http",
      range: "Node built-in",
      status: "supported",
      notes: "Raw node:http behavior is covered by integration tests."
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
      notes: "Redis 7 and Valkey 8 multi-instance contracts are exercised in CI."
    },
    {
      name: "OpenTelemetry API",
      range: ">=1.8.0",
      status: "optional",
      notes: "Use @rokadhq/dhal/telemetry/otel when OTel is configured in the app."
    },
    {
      name: "Signed webhook telemetry",
      range: "HTTP/HTTPS endpoint",
      status: "supported",
      notes: "HMAC signing and current package metadata are integration-tested."
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
      notes: "Generates proposed configuration and remains outside the stable v1 contract."
    },
    {
      name: "GitHub Actions publishing",
      range: "npm Trusted Publishing",
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
      notes: "Expected to work for consumption; release verification uses npm."
    }
  ],
  stability: {
    publicApi: "stable",
    configSchema: "stable",
    cli: "stable",
    note: "Dhal 1.0.0 is the stable v1 contract. Stable exports, CLI commands, and schemaVersion 1 remain backward compatible throughout v1.x."
  }
};

export function getDhalCompatibilityMatrix(): DhalCompatibilityMatrix {
  return DHAL_COMPATIBILITY_MATRIX;
}
