import { readFile, writeFile } from "node:fs/promises";

const version = "1.0.0-rc.0";
const packagePath = new URL("../package.json", import.meta.url);
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

packageJson.version = version;
packageJson.description = "Release-candidate app-native WAF for Node.js with a frozen v1 contract, route-aware protection, distributed controls, runtime safety, and production diagnostics.";
packageJson.engines = { ...packageJson.engines, node: ">=20.0.0" };
packageJson.scripts = {
  ...packageJson.scripts,
  "release:check:development": "tsx src/cli.ts release-check --target development --require-build",
  "release:check": "tsx src/cli.ts release-check --target rc --require-build",
  "release:check:rc": "tsx src/cli.ts release-check --target rc --require-build",
  "release:check:stable": "tsx src/cli.ts release-check --target stable --require-build",
  "prepublishOnly": "npm run verify:v1",
  "publish:local": "npm publish --tag rc --access public --provenance=false",
  "publish:ci": "npm publish --tag rc --access public"
};
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

await replaceInFile("../tests/engine.test.ts", (content) => content
  .replace('describe("Dhal v0.13 beta v1 contract hardening"', 'describe("Dhal v1 release candidate contract hardening"')
  .replaceAll('"0.13.0-beta.1"', '"1.0.0-rc.0"')
  .replaceAll('toBe("beta")', 'toBe("rc")'));

await replaceInFile("../src/config-schema.ts", (content) => content
  .replace("https://dhal.dev/schemas/v0.13/dhal.schema.json", "https://dhal.dev/schemas/v1/dhal.schema.json")
  .replace("Dhal configuration (schemaVersion 1, v0.13 beta)", "Dhal configuration (schemaVersion 1, v1 release candidate)"));

await replaceInFile("../V1_CONTRACT.md", (content) => content
  .replace("Dhal `v0.13.0-beta.1` introduces the first explicit v1-bound configuration contract.", "Dhal `1.0.0-rc.0` freezes the first stable v1 configuration and public API contract."));

await replaceInFile("../V1_RELEASE_PLAN.md", (content) => content
  .replace(
    "The current milestone is Phase 1 plus the package-export verifier from Phase 2. The package version remains on the beta line until these gates are merged and passing.",
    "The current milestone is `1.0.0-rc.0`. The public contract, package consumers, framework matrix, distributed stores, telemetry, and performance budgets are now enforced by the v1 release gate."
  ));

const changelogPath = new URL("../CHANGELOG.md", import.meta.url);
let changelog = await readFile(changelogPath, "utf8");
if (!changelog.includes("## 1.0.0-rc.0")) {
  const entry = `## 1.0.0-rc.0 — V1 release candidate\n\n### Added\n\n- Added a machine-readable v1 public contract and stable CLI inventory.\n- Added packed-package ESM, CommonJS, and TypeScript consumer verification.\n- Added Express 4/5, Fastify 4/5, and raw node:http integration coverage.\n- Added Redis 7 and Valkey 8 multi-instance contract tests.\n- Added signed webhook telemetry integration coverage and release performance budgets.\n- Added the unified \`dhal release-check\` command.\n\n### Changed\n\n- Raised the v1 minimum runtime to Node.js 20.\n- Promoted the package, schema, compatibility metadata, and publishing defaults to the RC channel.\n- Fixed Fastify plugin encapsulation so normal root registration protects root routes.\n- Replaced legacy telemetry version identifiers with the actual package version.\n\n`;
  changelog = changelog.replace("# Changelog\n\n", `# Changelog\n\n${entry}`);
  await writeFile(changelogPath, changelog);
}

console.log(`Prepared Dhal ${version} release-candidate metadata.`);

async function replaceInFile(relativePath, transform) {
  const path = new URL(relativePath, import.meta.url);
  const content = await readFile(path, "utf8");
  await writeFile(path, transform(content));
}
