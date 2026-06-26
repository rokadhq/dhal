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

  it("does not allow the beta version to masquerade as an RC", () => {
    const result = runDhalReleaseCheck({ target: "rc", requireBuild: false });

    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.code === "release.version" && finding.level === "fail")).toBe(true);
    expect(result.findings.some((finding) => finding.code === "release.channel" && finding.level === "fail")).toBe(true);
  });
});
