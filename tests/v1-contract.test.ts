import { describe, expect, it } from "vitest";
import {
  DHAL_V1_CLI_COMMANDS,
  DHAL_V1_CONTRACT_VERSION,
  DHAL_V1_PUBLIC_EXPORTS,
  getDhalV1Contract,
  validateDhalV1Contract
} from "../src/v1-contract.js";

describe("Dhal v1 contract", () => {
  it("uses config schema version 1", () => {
    const contract = getDhalV1Contract();
    expect(DHAL_V1_CONTRACT_VERSION).toBe("1");
    expect(contract.configSchemaVersion).toBe("1");
    expect(validateDhalV1Contract()).toEqual({ ok: true, issues: [] });
  });

  it("lists stable public adapters and diagnostics", () => {
    const stablePaths = DHAL_V1_PUBLIC_EXPORTS
      .filter((entry) => entry.stability === "stable")
      .map((entry) => entry.path);

    expect(stablePaths).toContain(".");
    expect(stablePaths).toContain("./express");
    expect(stablePaths).toContain("./fastify");
    expect(stablePaths).toContain("./node-http");
    expect(stablePaths).toContain("./migrations");
    expect(stablePaths).toContain("./readiness");
    expect(stablePaths).toContain("./v1-contract");
  });

  it("labels AI autosetup as experimental", () => {
    const autosetup = DHAL_V1_PUBLIC_EXPORTS.find((entry) => entry.path === "./autosetup");
    expect(autosetup?.stability).toBe("experimental");
  });

  it("has unique CLI command names", () => {
    expect(new Set(DHAL_V1_CLI_COMMANDS).size).toBe(DHAL_V1_CLI_COMMANDS.length);
    expect(DHAL_V1_CLI_COMMANDS).toContain("migrate");
    expect(DHAL_V1_CLI_COMMANDS).toContain("readiness");
    expect(DHAL_V1_CLI_COMMANDS).toContain("stability");
    expect(DHAL_V1_CLI_COMMANDS).toContain("replay");
  });
});
