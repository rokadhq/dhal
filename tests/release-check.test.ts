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

  it("validates the v1 release-candidate version and channel", () => {
    const result = runDhalReleaseCheck({ target: "rc", requireBuild: false });

    expect(result.ok).toBe(true);
    expect(result.packageVersion).toBe("1.0.0-rc.0");
    expect(result.releaseChannel).toBe("rc");
    expect(result.findings.some((finding) => finding.code === "release.version" && finding.level === "pass")).toBe(true);
    expect(result.findings.some((finding) => finding.code === "release.channel" && finding.level === "pass")).toBe(true);
  });
});
