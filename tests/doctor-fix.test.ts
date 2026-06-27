import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runDhalDoctorFix } from "../src/doctor-fix.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "dhal-doctor-fix-"));
  roots.push(root);
  return root;
}

describe("doctor --fix", () => {
  it("creates a missing monitor-mode configuration", () => {
    const root = workspace();

    const result = runDhalDoctorFix({ cwd: root });
    const config = JSON.parse(readFileSync(join(root, "dhal.json"), "utf8")) as {
      schemaVersion: string;
      mode: string;
    };

    expect(result.ok).toBe(true);
    expect(result.wrote).toBe(true);
    expect(result.actions).toContainEqual(expect.objectContaining({ code: "config.create", status: "applied" }));
    expect(config.schemaVersion).toBe("1");
    expect(config.mode).toBe("monitor");
  });

  it("migrates a supported pre-schemaVersion config and creates a backup", () => {
    const root = workspace();
    const configPath = join(root, "dhal.json");
    writeFileSync(configPath, JSON.stringify({ mode: "monitor", rateLimit: { enabled: false } }));

    const result = runDhalDoctorFix({ cwd: root });
    const config = JSON.parse(readFileSync(configPath, "utf8")) as { schemaVersion: string };

    expect(result.wrote).toBe(true);
    expect(config.schemaVersion).toBe("1");
    expect(existsSync(`${configPath}.bak`)).toBe(true);
    expect(result.actions).toContainEqual(expect.objectContaining({ code: "config.migrate", status: "applied" }));
  });

  it("previews fixes without writing when write is false", () => {
    const root = workspace();

    const result = runDhalDoctorFix({ cwd: root, write: false });

    expect(result.ok).toBe(true);
    expect(result.wrote).toBe(false);
    expect(result.actions).toContainEqual(expect.objectContaining({ code: "config.create", status: "preview" }));
    expect(existsSync(join(root, "dhal.json"))).toBe(false);
  });

  it("does not change already-current configuration", () => {
    const root = workspace();
    const initial = JSON.stringify({ schemaVersion: "1", mode: "monitor" }, null, 2);
    writeFileSync(join(root, "dhal.json"), `${initial}\n`);

    const result = runDhalDoctorFix({ cwd: root });

    expect(result.wrote).toBe(false);
    expect(result.actions).toContainEqual(expect.objectContaining({ code: "config.no_change", status: "skipped" }));
  });
});
