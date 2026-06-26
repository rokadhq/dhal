import { describe, expect, it } from "vitest";
import { runDhalReleaseCheck } from "../src/release-check.js";

describe("Dhal release check", () => {
  it("validates the development contract without requiring generated output", () => {
    const result = runDhalReleaseCheck({ target: "development", requireBuild: false });

    expect(result.ok).toBe(true);
    expect(result.target).toBe("development");
    expect(result.findings.some((finding) => finding.code === "contract.valid" && finding.level === "pass")).toBe(true);
    expect(result.findings.some((finding) => finding.code === "exports.unclassified" && finding.level === "pass")).toBe(true);
  });

  it("validates the stable v1 version and channel", () => {
    const result = runDhalReleaseCheck({ target: "stable", requireBuild: false });

    expect(result.ok).toBe(true);
    expect(result.packageVersion).toBe("1.0.0");
    expect(result.releaseChannel).toBe("latest");
    expect(result.findings.some((finding) => finding.code === "release.version" && finding.level === "pass")).toBe(true);
    expect(result.findings.some((finding) => finding.code === "release.channel" && finding.level === "pass")).toBe(true);
  });
});
