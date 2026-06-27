import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectFramework, detectPackageManager, runDhalAdd } from "../src/add.js";
import { applyDhalFrameworkPreset, listDhalFrameworkPresets } from "../src/framework-presets.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "dhal-add-"));
  roots.push(root);
  return root;
}

describe("dhal add", () => {
  it("detects frameworks and package managers without writing by default", () => {
    const root = project();
    writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { hono: "^4.0.0" } }));
    writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

    const result = runDhalAdd({ projectRoot: root });

    expect(result.ok).toBe(true);
    expect(result.framework).toBe("hono");
    expect(result.frameworkSource).toBe("detected");
    expect(result.packageManager).toBe("pnpm");
    expect(result.installCommand).toBe("pnpm add @rokadhq/dhal");
    expect(result.files.every((file) => file.action === "preview")).toBe(true);
    expect(existsSync(join(root, "dhal.json"))).toBe(false);
  });

  it("writes a monitor-mode config and framework integration module", () => {
    const root = project();
    writeFileSync(join(root, "package.json"), JSON.stringify({
      dependencies: { "@nestjs/core": "^11.0.0", "@rokadhq/dhal": "^1.1.0" }
    }));
    writeFileSync(join(root, "package-lock.json"), "{}\n");

    const result = runDhalAdd({ projectRoot: root, write: true });
    const config = JSON.parse(readFileSync(join(root, "dhal.json"), "utf8")) as { mode: string };
    const integration = readFileSync(join(root, "dhal.integration.ts"), "utf8");

    expect(result.wrote).toHaveLength(2);
    expect(config.mode).toBe("monitor");
    expect(integration).toContain("installDhalNest");
    expect(integration).toContain("before app.listen").not;
  });

  it("does not overwrite existing files unless force is provided", () => {
    const root = project();
    writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { koa: "^2.0.0" } }));
    writeFileSync(join(root, "dhal.json"), "{\"sentinel\":true}\n");

    const result = runDhalAdd({ projectRoot: root, write: true });

    expect(result.files.find((file) => file.kind === "config")?.action).toBe("skip");
    expect(readFileSync(join(root, "dhal.json"), "utf8")).toContain("sentinel");
  });

  it("supports explicit raw node:http onboarding", () => {
    const root = project();
    writeFileSync(join(root, "package.json"), JSON.stringify({}));

    const result = runDhalAdd({ projectRoot: root, framework: "node-http" });

    expect(result.ok).toBe(true);
    expect(result.frameworkSource).toBe("explicit");
    expect(result.files.find((file) => file.kind === "integration")?.content).toContain("createNodeHttpDhal");
  });
});

describe("framework presets", () => {
  it("lists and applies all supported framework baselines", () => {
    const presets = listDhalFrameworkPresets();
    expect(presets.map((preset) => preset.name)).toEqual(expect.arrayContaining([
      "express-api",
      "fastify-api",
      "nestjs-api",
      "koa-api",
      "hono-node-api",
      "node-http-api"
    ]));

    const config = applyDhalFrameworkPreset({}, "hono-node-api");
    expect(config.mode).toBe("monitor");
    expect(config.runtime.bypass.methods).toContain("OPTIONS");
    expect(config.routes["/api/login"]?.mode).toBe("monitor");
  });

  it("exposes deterministic detection helpers", () => {
    expect(detectFramework({ express: "5" })).toBe("express");
    expect(detectFramework({ "@nestjs/core": "11", express: "5" })).toBe("nestjs");
    const root = project();
    expect(detectPackageManager(root)).toBe("unknown");
  });
});
