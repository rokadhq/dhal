import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runDhalDoctor, type DhalDoctorOptions, type DhalDoctorResult } from "./doctor.js";
import { migrateDhalConfig } from "./migrations.js";
import { applyDhalPreset } from "./presets.js";

export type DhalDoctorFixOptions = DhalDoctorOptions & {
  write?: boolean | undefined;
  backup?: boolean | undefined;
};

export type DhalDoctorFixAction = {
  code: "config.create" | "config.migrate" | "config.no_change" | "config.error";
  status: "applied" | "preview" | "skipped" | "error";
  path: string;
  message: string;
  backupPath?: string | undefined;
};

export type DhalDoctorFixResult = {
  ok: boolean;
  wrote: boolean;
  configPath: string;
  actions: DhalDoctorFixAction[];
  doctor: DhalDoctorResult;
};

/**
 * Applies only conservative, mechanical repairs:
 * - create a missing monitor-mode starter config;
 * - migrate a supported pre-schemaVersion config to schemaVersion 1.
 *
 * It never enables blocking, trustProxy, Redis, reputation providers,
 * webhooks, or other environment-dependent behavior.
 */
export function runDhalDoctorFix(options: DhalDoctorFixOptions = {}): DhalDoctorFixResult {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? "dhal.json";
  const resolvedConfigPath = resolve(cwd, configPath);
  const write = options.write !== false;
  const backup = options.backup !== false;
  const actions: DhalDoctorFixAction[] = [];
  let wrote = false;

  if (!existsSync(resolvedConfigPath)) {
    const config = applyDhalPreset({}, "starter");
    config.mode = "monitor";
    const content = `${JSON.stringify(config, null, 2)}\n`;

    if (write) {
      mkdirSync(dirname(resolvedConfigPath), { recursive: true });
      writeFileSync(resolvedConfigPath, content);
      wrote = true;
      actions.push({
        code: "config.create",
        status: "applied",
        path: resolvedConfigPath,
        message: "Created a reviewable monitor-mode starter configuration."
      });
    } else {
      actions.push({
        code: "config.create",
        status: "preview",
        path: resolvedConfigPath,
        message: "Would create a reviewable monitor-mode starter configuration."
      });
    }
  } else {
    try {
      const raw = JSON.parse(readFileSync(resolvedConfigPath, "utf8")) as unknown;
      const migration = migrateDhalConfig(raw);

      if (!migration.changed) {
        actions.push({
          code: "config.no_change",
          status: "skipped",
          path: resolvedConfigPath,
          message: "Configuration already uses the current schema version; no safe mechanical repair was required."
        });
      } else if (write) {
        let backupPath: string | undefined;
        if (backup) {
          backupPath = `${resolvedConfigPath}.bak`;
          copyFileSync(resolvedConfigPath, backupPath);
        }
        writeFileSync(resolvedConfigPath, `${JSON.stringify(migration.config, null, 2)}\n`);
        wrote = true;
        actions.push({
          code: "config.migrate",
          status: "applied",
          path: resolvedConfigPath,
          message: `Migrated configuration to schemaVersion ${migration.toSchemaVersion}.`,
          ...(backupPath ? { backupPath } : {})
        });
      } else {
        actions.push({
          code: "config.migrate",
          status: "preview",
          path: resolvedConfigPath,
          message: `Would migrate configuration to schemaVersion ${migration.toSchemaVersion}.`
        });
      }
    } catch (error) {
      actions.push({
        code: "config.error",
        status: "error",
        path: resolvedConfigPath,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const doctor = runDhalDoctor({ cwd, configPath, env: options.env });
  return {
    ok: actions.every((action) => action.status !== "error") && (write ? doctor.ok : true),
    wrote,
    configPath: resolvedConfigPath,
    actions,
    doctor
  };
}
