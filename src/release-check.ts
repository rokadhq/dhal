import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DHAL_PACKAGE_VERSION, DHAL_RELEASE_CHANNEL } from "./compatibility.js";
import { getDhalConfigJsonSchema } from "./config-schema.js";
import { DHAL_V1_PUBLIC_EXPORTS, validateDhalV1Contract } from "./v1-contract.js";

export type DhalReleaseTarget = "development" | "rc" | "stable";
export type DhalReleaseCheckLevel = "pass" | "warning" | "fail";

export type DhalReleaseCheckFinding = {
  code: string;
  level: DhalReleaseCheckLevel;
  message: string;
};

export type DhalReleaseCheckResult = {
  ok: boolean;
  target: DhalReleaseTarget;
  packageVersion: string;
  releaseChannel: string;
  findings: DhalReleaseCheckFinding[];
};

export type DhalReleaseCheckOptions = {
  rootDir?: string | undefined;
  target?: DhalReleaseTarget | undefined;
  requireBuild?: boolean | undefined;
};

const STABLE_REQUIRED_FILES = [
  "README.md",
  "SECURITY.md",
  "PRODUCTION_SUPPORT.md",
  "STABLE_RELEASE_PLAN.md",
  "UPGRADING.md",
  "PUBLISHING.md",
  "CHANGELOG.md",
  "V1_CONTRACT.md"
] as const;

export function runDhalReleaseCheck(options: DhalReleaseCheckOptions = {}): DhalReleaseCheckResult {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const target = options.target ?? "development";
  const requireBuild = options.requireBuild ?? target !== "development";
  const releaseChannel = String(DHAL_RELEASE_CHANNEL);
  const findings: DhalReleaseCheckFinding[] = [];
  const packageJson = readJson(resolve(rootDir, "package.json"));
  const packageLock = readJson(resolve(rootDir, "package-lock.json"));
  const packageVersion = stringValue(packageJson.version);

  add(findings, packageJson.name === "@rokadhq/dhal", "package.name", "Package name is @rokadhq/dhal.", `Unexpected package name: ${String(packageJson.name)}`);
  add(findings, packageVersion === DHAL_PACKAGE_VERSION, "version.compatibility", "Package and compatibility versions match.", `package.json is ${packageVersion}; compatibility metadata is ${DHAL_PACKAGE_VERSION}.`);

  const lockRoot = isRecord(packageLock.packages) ? packageLock.packages[""] : undefined;
  const lockVersion = isRecord(lockRoot) ? stringValue(lockRoot.version) : stringValue(packageLock.version);
  add(findings, lockVersion === packageVersion, "version.lockfile", "Package lock version matches package.json.", `package-lock.json is ${lockVersion}; package.json is ${packageVersion}.`);

  const contract = validateDhalV1Contract();
  add(findings, contract.ok, "contract.valid", "The machine-readable v1 contract is valid.", contract.issues.join(" ") || "The v1 contract is invalid.");

  const exportMap = isRecord(packageJson.exports) ? packageJson.exports : {};
  const declaredExports = new Set(Object.keys(exportMap));
  const contractExports = new Set(DHAL_V1_PUBLIC_EXPORTS.map((entry) => entry.path));
  const missingFromPackage = [...contractExports].filter((entry) => !declaredExports.has(entry));
  const unclassified = [...declaredExports].filter((entry) => !contractExports.has(entry));
  add(findings, missingFromPackage.length === 0, "exports.contract_missing", "Every v1 contract export exists in package.json.", `Missing package exports: ${missingFromPackage.join(", ")}`);
  add(findings, unclassified.length === 0, "exports.unclassified", "Every package export is classified by the v1 contract.", `Unclassified package exports: ${unclassified.join(", ")}`);

  const schema = getDhalConfigJsonSchema();
  const schemaProperties = isRecord(schema.properties) ? schema.properties : {};
  const schemaVersion = isRecord(schemaProperties.schemaVersion) ? schemaProperties.schemaVersion.const : undefined;
  add(findings, schemaVersion === "1", "schema.version", "Published configuration schema is schemaVersion 1.", `Unexpected schemaVersion contract: ${String(schemaVersion)}`);

  const directTargets = [
    packageJson.main,
    packageJson.module,
    packageJson.types,
    ...Object.values(isRecord(packageJson.bin) ? packageJson.bin : {})
  ].filter((entry): entry is string => typeof entry === "string");
  const buildTargets = [...collectTargets(packageJson.exports), ...directTargets]
    .filter((entry) => entry.startsWith("./"));
  const missingBuildTargets = [...new Set(buildTargets)].filter((entry) => !existsSync(resolve(rootDir, entry)));
  if (missingBuildTargets.length === 0) {
    findings.push({ code: "build.targets", level: "pass", message: "Every published build target exists." });
  } else {
    findings.push({
      code: "build.targets",
      level: requireBuild ? "fail" : "warning",
      message: `Missing generated build targets: ${missingBuildTargets.join(", ")}`
    });
  }

  validateTarget(findings, target, packageVersion, releaseChannel);
  if (target === "stable") validateStableProductionRequirements(findings, rootDir, packageJson);

  return {
    ok: findings.every((finding) => finding.level !== "fail"),
    target,
    packageVersion,
    releaseChannel,
    findings
  };
}

function validateTarget(findings: DhalReleaseCheckFinding[], target: DhalReleaseTarget, version: string, releaseChannel: string): void {
  if (target === "development") {
    findings.push({ code: "release.target", level: "pass", message: "Development release checks selected." });
    return;
  }

  if (target === "rc") {
    add(findings, /^1\.0\.0-rc\.\d+$/.test(version), "release.version", "Version is a Dhal v1 release candidate.", `RC target requires 1.0.0-rc.N; found ${version}.`);
    add(findings, releaseChannel === "rc", "release.channel", "Release channel is rc.", `RC target requires release channel rc; found ${releaseChannel}.`);
    return;
  }

  add(findings, /^1\.\d+\.\d+$/.test(version), "release.version", "Version is a stable v1 release.", `Stable target requires 1.x.y without a prerelease suffix; found ${version}.`);
  add(findings, releaseChannel === "latest", "release.channel", "Release channel is latest.", `Stable target requires release channel latest; found ${releaseChannel}.`);
}

function validateStableProductionRequirements(
  findings: DhalReleaseCheckFinding[],
  rootDir: string,
  packageJson: Record<string, unknown>
): void {
  const missingFiles = STABLE_REQUIRED_FILES.filter((file) => !existsSync(resolve(rootDir, file)));
  add(findings, missingFiles.length === 0, "stable.documentation", "All required production documentation exists.", `Missing production documentation: ${missingFiles.join(", ")}`);

  const security = readOptionalText(resolve(rootDir, "SECURITY.md"));
  add(findings, security.includes("Latest stable `1.x`"), "stable.security_policy", "Security policy declares the stable v1 support line.", "SECURITY.md does not declare support for the latest stable 1.x line.");

  const support = readOptionalText(resolve(rootDir, "PRODUCTION_SUPPORT.md"));
  add(findings, support.includes("Compatibility guarantees") && support.includes("Severity and response targets"), "stable.support_policy", "Production support and compatibility commitments are documented.", "PRODUCTION_SUPPORT.md is missing compatibility or response-target commitments.");

  const changelog = readOptionalText(resolve(rootDir, "CHANGELOG.md"));
  add(findings, changelog.includes("## 1.0.0"), "stable.changelog", "Stable 1.0.0 has a changelog entry.", "CHANGELOG.md does not contain a stable 1.0.0 entry.");

  const engine = isRecord(packageJson.engines) ? stringValue(packageJson.engines.node) : "unknown";
  add(findings, engine.startsWith(">=20"), "stable.node_runtime", "Stable v1 requires Node.js 20 or newer.", `Stable v1 must require Node.js >=20; found ${engine}.`);

  const scripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  const prepublish = stringValue(scripts.prepublishOnly);
  add(findings, prepublish.includes("verify:v1"), "stable.prepublish_gate", "Stable publication runs the complete v1 verification gate.", "prepublishOnly must run verify:v1.");

  const publishCi = stringValue(scripts["publish:ci"]);
  add(findings, publishCi.includes("--tag latest"), "stable.publish_tag", "Stable publishing uses the latest npm dist-tag.", "publish:ci must publish stable v1 with --tag latest.");

  const files = Array.isArray(packageJson.files) ? packageJson.files.filter((entry): entry is string => typeof entry === "string") : [];
  const missingPublishedPolicies = ["SECURITY.md", "PRODUCTION_SUPPORT.md"].filter((file) => !files.includes(file));
  add(findings, missingPublishedPolicies.length === 0, "stable.published_policies", "Security and support policies are included in the package.", `Package files omit: ${missingPublishedPolicies.join(", ")}`);
}

function add(findings: DhalReleaseCheckFinding[], condition: boolean, code: string, pass: string, fail: string): void {
  findings.push({ code, level: condition ? "pass" : "fail", message: condition ? pass : fail });
}

function collectTargets(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectTargets);
  if (isRecord(value)) return Object.values(value).flatMap(collectTargets);
  return [];
}

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) throw new Error(`Required release file is missing: ${path}`);
  const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!isRecord(value)) throw new Error(`Expected a JSON object in ${path}`);
  return value;
}

function readOptionalText(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
