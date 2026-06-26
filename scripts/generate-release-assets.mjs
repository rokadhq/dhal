import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const verifyOnly = process.argv.includes("--verify-only");
const outputArgument = argumentValue("--output-dir");
const temporary = verifyOnly ? await mkdtemp(resolve(tmpdir(), "dhal-release-assets-")) : undefined;
const outputDir = resolve(root, outputArgument ?? temporary ?? "release-assets");

try {
  await mkdir(outputDir, { recursive: true });
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const packResult = JSON.parse(run(npm, [
    "pack",
    "--json",
    "--ignore-scripts",
    "--pack-destination",
    outputDir
  ], root));

  if (!Array.isArray(packResult) || typeof packResult[0]?.filename !== "string") {
    throw new Error("npm pack did not return a package filename.");
  }

  const packedPath = resolve(outputDir, packResult[0].filename);
  const canonicalTarball = resolve(outputDir, `rokadhq-dhal-${packageJson.version}.tgz`);
  if (packedPath !== canonicalTarball) await copyFile(packedPath, canonicalTarball);

  const sbomPath = resolve(outputDir, "dhal-sbom.cdx.json");
  const sbom = run(npm, ["sbom", "--sbom-format", "cyclonedx", "--omit=dev"], root);
  JSON.parse(sbom);
  await writeFile(sbomPath, `${sbom}\n`);

  const files = [canonicalTarball, sbomPath];
  const manifestFiles = [];
  for (const file of files) {
    const bytes = await readFile(file);
    const metadata = await stat(file);
    manifestFiles.push({
      name: basename(file),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: metadata.size
    });
  }

  const manifest = {
    schemaVersion: 1,
    packageName: packageJson.name,
    version: packageJson.version,
    generatedAt: new Date().toISOString(),
    files: manifestFiles
  };
  const manifestPath = resolve(outputDir, "dhal-release-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const checksums = manifestFiles
    .map((file) => `${file.sha256}  ${file.name}`)
    .join("\n");
  await writeFile(resolve(outputDir, "SHA256SUMS"), `${checksums}\n`);

  validateManifest(manifest, packageJson);
  console.log(`Dhal release assets generated for ${packageJson.name}@${packageJson.version}`);
  for (const file of manifestFiles) console.log(`- ${file.name} ${file.sha256}`);
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}

function validateManifest(manifest, packageJson) {
  if (manifest.packageName !== "@rokadhq/dhal") throw new Error("Unexpected package name in release manifest.");
  if (manifest.version !== packageJson.version) throw new Error("Release manifest version does not match package.json.");
  if (manifest.files.length !== 2) throw new Error("Release manifest must contain the package tarball and SBOM.");
  for (const file of manifest.files) {
    if (!/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error(`Invalid SHA-256 digest for ${file.name}.`);
    if (!Number.isInteger(file.bytes) || file.bytes < 1) throw new Error(`Invalid byte size for ${file.name}.`);
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, npm_config_update_notifier: "false" }
  }).trim();
}
