import { performance } from "node:perf_hooks";
import { createDhal } from "../src/engine.js";
import type { DhalRequest } from "../src/types.js";

const iterations = Number(process.env.DHAL_BENCH_ITERATIONS ?? 50_000);
const logger = { log() {}, warn() {}, error() {} };
const engine = createDhal({
  configPath: "./missing-dhal-bench-config.json",
  logger,
  config: {
    mode: "block",
    trustProxy: true,
    rateLimit: { enabled: false },
    ip: { reputation: { enabled: false } },
    observability: {
      logs: { enabled: false },
      events: { enabled: false },
      otel: { enabled: false },
      webhooks: { enabled: false }
    }
  }
});

const request: DhalRequest = {
  method: "GET",
  url: "/api/health?ok=true",
  path: "/api/health",
  headers: {
    "user-agent": "Mozilla/5.0",
    accept: "application/json",
    "accept-language": "en-US",
    "x-forwarded-for": "203.0.113.20"
  },
  ip: "203.0.113.20",
  route: "/api/health"
};

const started = performance.now();
for (let i = 0; i < iterations; i += 1) {
  await engine.inspect(request);
}
const elapsedMs = performance.now() - started;
const perRequestMs = elapsedMs / iterations;
const requestsPerSecond = Math.round(1000 / perRequestMs);

console.log(JSON.stringify({
  iterations,
  elapsedMs: Number(elapsedMs.toFixed(2)),
  perRequestMs: Number(perRequestMs.toFixed(4)),
  requestsPerSecond
}, null, 2));
