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

const engineTestPath = new URL("../tests/engine.test.ts", import.meta.url);
let engineTest = await readFile(engineTestPath, "utf8");
engineTest = engineTest
  .replace('describe("Dhal v0.13 beta v1 contract hardening"', 'describe("Dhal v1 release candidate contract hardening"')
  .replaceAll('"0.13.0-beta.1"', '"1.0.0-rc.0"')
  .replaceAll('toBe("beta")', 'toBe("rc")');
await writeFile(engineTestPath, engineTest);

console.log(`Prepared Dhal ${version} release-candidate metadata.`);
