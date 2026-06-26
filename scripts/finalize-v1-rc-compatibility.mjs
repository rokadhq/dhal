import { readFile, writeFile } from "node:fs/promises";

const compatibilityPath = new URL("../src/compatibility.ts", import.meta.url);
let content = await readFile(compatibilityPath, "utf8");

for (const name of ["Express", "Fastify", "node:http", "Redis / Valkey", "Signed webhook telemetry"]) {
  const marker = `name: ${JSON.stringify(name)}`;
  const start = content.indexOf(marker);
  if (start < 0) throw new Error(`Compatibility entry not found: ${name}`);
  const status = content.indexOf('status: "tested"', start);
  if (status < 0) continue;
  content = `${content.slice(0, status)}status: "supported"${content.slice(status + 'status: "tested"'.length)}`;
}

await writeFile(compatibilityPath, content);
console.log("Promoted verified framework and distributed integrations to supported.");
