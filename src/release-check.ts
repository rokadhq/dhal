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

const REQUIRED_RELEASE_DOCUMENTS = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "SUPPORT_POLICY.md",
  "PRODUCTION_DEPLOYMENT.md",
  "API_STABILITY.md",
  "UPGRADING.md",
  "PUBLISHING.md",
  "RELEASE_INTEGRITY.md",
  "CHANGELOG.md",
  "NESTJS.md",
  "KOA_HONO.md",
  "ONBOARDING.md",
  "OPENAPI.md"
] as const;

const REQUIRED_RELEASE_WORKFLOWS = [
  ".github/workflows/publish.yml",
  ".github/workflows/v1-release-gate.yml",
  ".github/workflows/release-assets.yml"
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

  const packageFiles = new Set(stringArray(packageJson.files));
  const missingDocuments = REQUIRED_RELEASE_DOCUMENTS.filter((path) => !existsSync(resolve(rootDir, path)));
  add(findings, missingDocuments.length === 0, "docs.required", "All required production and release documents exist.", `Missing required documents: ${missingDocuments.join(", ")}`);

  const unpublishedDocuments = REQUIRED_RELEASE_DOCUMENTS.filter((path) => !packageFiles.has(path));
  add(findings, unpublishedDocuments.length === 0, "docs.packaged", "All required production documents are included in the npm package.", `Required documents omitted from package files: ${unpublishedDocuments.join(", ")}`);

  const missingWorkflows = REQUIRED_RELEASE_WORKFLOWS.filter((path) => !existsSync(resolve(rootDir, path)));
  add(findings, missingWorkflows.length === 0, "workflows.required", "Publishing, release-gate, and release-asset workflows exist.", `Missing release workflows: ${missingWorkflows.join(", ")}`);

  const scripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  add(findings, stringValue(scripts["verify:supply-chain"]) !== "unknown", "supply_chain.verify_script", "Supply-chain artifacts are verified by package scripts.", "Missing verify:supply-chain script.");
  add(findings, stringValue(scripts["release:assets"]) !== "unknown", "supply_chain.asset_script", "Release assets can be generated deterministically.", "Missing release:assets script.");

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

  validateTarget(findings, target, packageVersion, releaseChannel, packageJson, packageFiles, scripts);

  return {
    ok: findings.every((finding) => finding.level !== "fail"),
    target,
    packageVersion,
    releaseChannel,
    findings
  };
}

function validateTarget(
  findings: DhalReleaseCheckFinding[],
  target: DhalReleaseTarget,
  version: string,
  releaseChannel: string,
  packageJson: Record<string, unknown>,
  packageFiles: Set<string>,
  scripts: Record<string, unknown>
): void {
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
  add(findings, !stringValue(packageJson.description).toLowerCase().includes("release-candidate"), "stable.description", "Package description is stable-release language.", "Stable package description still contains release-candidate language.");
  add(findings, !packageFiles.has("ALPHA.md") && !packageFiles.has("BETA.md"), "stable.package_files", "Prerelease guidance is excluded from the stable package.", "Stable package files still include ALPHA.md or BETA.md.");
  add(findings, stringValue(scripts["release:check"]).includes("--target stable"), "stable.default_check", "Default release check targets stable.", "Default release:check script does not target stable.");
  add(findings, !stringValue(scripts["publish:ci"]).includes("--tag rc"), "stable.publish_tag", "CI publishing no longer pins the rc tag.", "Stable publish:ci script still pins the rc dist-tag.");
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
