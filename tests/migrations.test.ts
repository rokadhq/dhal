import { describe, expect, it } from "vitest";
import { migrateDhalConfig } from "../src/migrations.js";

describe("Dhal config migrations", () => {
  it("adds schemaVersion 1 to unversioned configs", () => {
    const result = migrateDhalConfig({
      mode: "monitor",
      rateLimit: {
        default: {
          windowSeconds: 10,
          max: 3
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.fromSchemaVersion).toBeNull();
    expect(result.toSchemaVersion).toBe("1");
    expect(result.config.schemaVersion).toBe("1");
    expect(result.config.rateLimit.default.max).toBe(3);
  });

  it("rejects unsupported schema versions", () => {
    expect(() =>
      migrateDhalConfig({
        schemaVersion: "2",
        mode: "monitor"
      })
    ).toThrow(/Unsupported schemaVersion/);
  });
});
