import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const missing = [];
const checked = new Set();

for (const target of collectTargets(packageJson.exports)) {
  await checkTarget(target);
}

for (const target of [packageJson.main, packageJson.module, packageJson.types, ...Object.values(packageJson.bin ?? {})]) {
  if (typeof target === "string") await checkTarget(target);
}

if (missing.length > 0) {
  console.error("Dhal package export verification failed:");
  for (const target of missing) console.error(`- missing ${target}`);
  process.exitCode = 1;
} else {
  console.log(`Dhal package exports: ${checked.size} targets verified`);
}

async function checkTarget(target) {
  if (!target.startsWith("./") || checked.has(target)) return;
  checked.add(target);
  try {
    await access(resolve(root, target), constants.R_OK);
  } catch {
    missing.push(target);
  }
}

function collectTargets(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectTargets);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectTargets);
  return [];
}
