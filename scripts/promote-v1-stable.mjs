import { readFile, writeFile } from "node:fs/promises";

const version = "1.0.0";

await updateJson("../package.json", (packageJson) => {
  packageJson.version = version;
  packageJson.description = "Stable app-native WAF for Node.js with route-aware protection, distributed controls, runtime safety, production diagnostics, and a frozen v1 contract.";
  packageJson.files = (packageJson.files ?? []).filter((entry) => entry !== "ALPHA.md" && entry !== "BETA.md");
  packageJson.scripts = {
    ...packageJson.scripts,
    "release:check": "tsx src/cli.ts release-check --target stable --require-build",
    "release:check:stable": "tsx src/cli.ts release-check --target stable --require-build",
    "prepublishOnly": "npm run verify:v1",
    "publish:local": "npm publish --tag latest --access public --provenance=false",
    "publish:ci": "npm publish --tag latest --access public"
  };
  return packageJson;
});

await replaceInFile("../src/compatibility.ts", (content) => content
  .replace('export const DHAL_PACKAGE_VERSION = "1.0.0-rc.0";', 'export const DHAL_PACKAGE_VERSION = "1.0.0";')
  .replace('export const DHAL_RELEASE_CHANNEL = "rc" as const;', 'export const DHAL_RELEASE_CHANNEL = "latest" as const;')
  .replace('publicApi: "release-candidate"', 'publicApi: "stable"')
  .replace('cli: "release-candidate"', 'cli: "stable"')
  .replace(
    'note: "Dhal 1.0.0-rc.0 freezes schemaVersion 1 and the stable export/CLI inventories. RC feedback may fix defects but must not silently break the declared v1 contract."',
    'note: "Dhal 1.0.0 is the stable v1 contract. Stable exports, CLI commands, and schemaVersion 1 remain backward compatible throughout v1.x."'
  ));

await replaceInFile("../src/stability.ts", (content) => content
  .replace(
    '{ name: "OpenTelemetry adapter", importPath: "@rokadhq/dhal/telemetry/otel", level: "release-candidate", notes: "The adapter API is frozen; emitted attribute additions may still occur before stable v1." }',
    '{ name: "OpenTelemetry adapter", importPath: "@rokadhq/dhal/telemetry/otel", level: "stable", notes: "The adapter API and existing emitted attributes are part of the stable v1 contract; additive attributes may be introduced in minor releases." }'
  ));

await replaceInFile("../src/config-schema.ts", (content) => content
  .replace("Dhal configuration (schemaVersion 1, v1 release candidate)", "Dhal configuration (schemaVersion 1, stable v1)")
  .replace("Dhal config schema contract version. v0.13 introduces schemaVersion 1 as the v1-bound config contract.", "Stable Dhal v1 configuration contract version."));

await replaceInFile("../tests/engine.test.ts", (content) => content
  .replace('describe("Dhal v1 release candidate contract hardening"', 'describe("Dhal stable v1 contract"')
  .replaceAll('"1.0.0-rc.0"', '"1.0.0"')
  .replaceAll('toBe("rc")', 'toBe("latest")'));

await replaceInFile("../tests/release-check.test.ts", (content) => content
  .replace('it("validates the v1 release-candidate version and channel"', 'it("validates the stable v1 version and channel"')
  .replace('target: "rc"', 'target: "stable"')
  .replace('"1.0.0-rc.0"', '"1.0.0"')
  .replace('toBe("rc")', 'toBe("latest")'));

await replaceInFile("../API_STABILITY.md", (content) => content
  .replace("Dhal `1.0.0-rc.0` freezes the public v1 contract for release-candidate validation.", "Dhal `1.0.0` is the stable public v1 contract.")
  .replace("During the RC phase, defects may be fixed without changing the declared stable contract. Within the stable v1 line:", "Within the stable v1 line:"));

await replaceInFile("../V1_READINESS.md", (content) => content
  .replace("Dhal `1.0.0-rc.0` is the release-candidate validation line for the first stable `1.0.0` release.", "Dhal `1.0.0` is the first stable production release.")
  .replace("Stable `1.0.0` must pass the same release matrix with the package version and release channel promoted from `rc` to `latest`.", "Every v1.x release must pass the same release matrix and stable release target."));

await replaceInFile("../V1_CONTRACT.md", (content) => content
  .replace("Dhal `1.0.0-rc.0` freezes the first stable v1 configuration and public API contract.", "Dhal `1.0.0` establishes the stable v1 configuration and public API contract.")
  .replace("`schemaVersion: \"1\"` is the target configuration contract for the first stable `v1.0.0` release.", "`schemaVersion: \"1\"` is the stable configuration contract for the v1 release line.")
  .replace("For beta users:", "For production users:"));

await replaceInFile("../V1_RELEASE_PLAN.md", (content) => content
  .replace("This branch prepares `1.0.0-rc.0` as the contract-validation release before stable `1.0.0`.", "This document records the completed path to stable `1.0.0` and the ongoing v1 maintenance requirements.")
  .replace("The current milestone is `1.0.0-rc.0`. The public contract, package consumers, framework matrix, distributed stores, telemetry, and performance budgets are now enforced by the v1 release gate.", "The current milestone is stable `1.0.0`. The public contract, package consumers, framework matrix, distributed stores, telemetry, supply-chain assets, and performance budgets are enforced by the v1 release gates."));

await replaceInFile("../UPGRADING.md", (content) => content
  .replace("## From v0.13 beta to v1.0.0-rc.0", "## From v0.13 beta or v1 RC to stable v1.0.0")
  .replace("Install the release-candidate tag explicitly:", "Install the stable release:")
  .replace("npm install @rokadhq/dhal@rc", "npm install @rokadhq/dhal@latest")
  .replace("## Notable v1 RC changes", "## Notable stable v1 changes"));

await replaceInFile("../PUBLISHING.md", (content) => content
  .replace("For the current release candidate, the unified release check must report `target: \"rc\"`, package version `1.0.0-rc.0`, and release channel `rc`.", "For stable v1, the unified release check must report `target: \"stable\"`, package version `1.0.0`, and release channel `latest`.")
  .replace("For `1.0.0-rc.0`, publishing produces:", "For `1.0.0`, publishing produces:")
  .replace("@rokadhq/dhal@1.0.0-rc.0", "@rokadhq/dhal@1.0.0")
  .replace("npm dist-tag: rc", "npm dist-tag: latest")
  .replace("npm publish --tag rc --access public --provenance=false", "npm publish --tag latest --access public --provenance=false"));

const changelogPath = new URL("../CHANGELOG.md", import.meta.url);
let changelog = await readFile(changelogPath, "utf8");
if (!changelog.includes("## 1.0.0 — Stable v1")) {
  const entry = `## 1.0.0 — Stable v1\n\n### Production hardening\n\n- Added graceful engine and telemetry lifecycle methods: \`flush()\`, \`close()\`, and \`getRuntimeSnapshot()\`.\n- Isolated application event-listener and synchronous telemetry failures from request handling.\n- Added bounded webhook delivery with pending, delivered, failed, and dropped counters.\n- Refused enforcing startup when declared Redis or blocking-reputation dependencies are unavailable.\n\n### Enterprise readiness\n\n- Added stable support, deprecation, security, and production deployment policies.\n- Added CycloneDX SBOM, SHA-256 checksum, package tarball, and release-manifest generation.\n- Added release-asset automation and supply-chain validation.\n- Replaced beta-era README guidance with stable production onboarding and operational documentation.\n\n### Stability\n\n- Promoted the package, CLI, schemaVersion 1, framework adapters, distributed stores, webhook telemetry, and OpenTelemetry adapter to the stable v1 contract.\n- Published stable builds under the npm \`latest\` dist-tag.\n\n`;
  changelog = changelog.replace("# Changelog\n\n", `# Changelog\n\n${entry}`);
  await writeFile(changelogPath, changelog);
}

console.log(`Prepared Dhal ${version} stable release metadata.`);

async function updateJson(relativePath, transform) {
  const path = new URL(relativePath, import.meta.url);
  const value = JSON.parse(await readFile(path, "utf8"));
  await writeFile(path, `${JSON.stringify(transform(value), null, 2)}\n`);
}

async function replaceInFile(relativePath, transform) {
  const path = new URL(relativePath, import.meta.url);
  const content = await readFile(path, "utf8");
  await writeFile(path, transform(content));
}
