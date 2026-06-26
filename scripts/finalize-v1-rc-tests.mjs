import { readFile, writeFile } from "node:fs/promises";

const testPath = new URL("../tests/engine.test.ts", import.meta.url);
const current = await readFile(testPath, "utf8");
const updated = current.replaceAll('level === "stable-for-v1"', 'level === "stable"');

if (updated === current) {
  console.log("V1 stability assertions are already current.");
} else {
  await writeFile(testPath, updated);
  console.log("Promoted stability assertions to the v1 labels.");
}
