import { deepMerge, defaultConfig, DHAL_CONFIG_SCHEMA_VERSION } from "./config.js";
import type { DhalConfig, PartialDeep } from "./types.js";

export type DhalMigrationNotice = {
  level: "info" | "warning";
  code: string;
  message: string;
};

export type DhalMigrationResult = {
  ok: boolean;
  changed: boolean;
  fromSchemaVersion: string | null;
  toSchemaVersion: typeof DHAL_CONFIG_SCHEMA_VERSION;
  config: DhalConfig;
  notices: DhalMigrationNotice[];
};

export type DhalMigrationPlan = {
  currentSchemaVersion: typeof DHAL_CONFIG_SCHEMA_VERSION;
  supportedInputVersions: Array<string | null>;
  notes: string[];
};

export function getDhalMigrationPlan(): DhalMigrationPlan {
  return {
    currentSchemaVersion: DHAL_CONFIG_SCHEMA_VERSION,
    supportedInputVersions: [null, "1"],
    notes: [
      "Configs without schemaVersion are treated as pre-v0.13 configs and migrated to schemaVersion 1.",
      "Unknown schema versions are rejected.",
      "Run `npx dhal migrate dhal.json --write` before adopting v1-bound configs."
    ]
  };
}

export function migrateDhalConfig(input: unknown): DhalMigrationResult {
  const source = isObject(input) ? input : {};
  const rawVersion = typeof source.schemaVersion === "string" ? source.schemaVersion : null;
  const notices: DhalMigrationNotice[] = [];
  let changed = false;

  if (rawVersion === null) {
    notices.push({
      level: "info",
      code: "schemaVersion.added",
      message: `Added schemaVersion ${DHAL_CONFIG_SCHEMA_VERSION}.`
    });
    changed = true;
  } else if (rawVersion !== DHAL_CONFIG_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion '${rawVersion}'. Expected '${DHAL_CONFIG_SCHEMA_VERSION}'.`);
  }

  const normalized = {
    ...source,
    schemaVersion: DHAL_CONFIG_SCHEMA_VERSION
  } as PartialDeep<DhalConfig>;

  const config = deepMerge(defaultConfig, normalized) as DhalConfig;

  return {
    ok: true,
    changed,
    fromSchemaVersion: rawVersion,
    toSchemaVersion: DHAL_CONFIG_SCHEMA_VERSION,
    config,
    notices
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
