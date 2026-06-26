import { performance } from "node:perf_hooks";
import { createDhal } from "../src/engine.js";
import type { DhalRequest } from "../src/types.js";

const iterations = numberEnv("DHAL_RELEASE_BENCH_ITERATIONS", 20_000);
const warmupIterations = numberEnv("DHAL_RELEASE_BENCH_WARMUP", 2_000);
const maxAverageMs = numberEnv("DHAL_RELEASE_MAX_AVERAGE_MS", 0.5);
const maxP95Ms = numberEnv("DHAL_RELEASE_MAX_P95_MS", 1);
const minRequestsPerSecond = numberEnv("DHAL_RELEASE_MIN_RPS", 2_000);
const maxHeapGrowthMb = numberEnv("DHAL_RELEASE_MAX_HEAP_MB", 32);

const engine = createDhal({
  configPath: "./missing-dhal-release-bench-config.json",
  logger: { log() {}, warn() {}, error() {} },
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
  method: "POST",
  url: "/api/orders?source=dashboard",
  path: "/api/orders",
  route: "/api/orders",
  headers: {
    host: "api.example.test",
    accept: "application/json",
    "content-type": "application/json",
    "content-length": "54",
    "user-agent": "Mozilla/5.0",
    "accept-language": "en-US",
    "x-forwarded-for": "203.0.113.20"
  },
  ip: "203.0.113.20",
  body: { sku: "dhal-v1", quantity: 2, source: "dashboard" },
  contentLength: 54
};

for (let index = 0; index < warmupIterations; index += 1) {
  await engine.inspect(request);
}

const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
gc?.();
const heapBefore = process.memoryUsage().heapUsed;
const samples: number[] = [];
const started = performance.now();

for (let index = 0; index < iterations; index += 1) {
  const requestStarted = performance.now();
  await engine.inspect(request);
  samples.push(performance.now() - requestStarted);
}

const elapsedMs = performance.now() - started;
gc?.();
const heapAfter = process.memoryUsage().heapUsed;
const averageMs = elapsedMs / iterations;
const requestsPerSecond = 1000 / averageMs;
samples.sort((left, right) => left - right);
const p95Ms = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))] ?? 0;
const heapGrowthMb = Math.max(0, heapAfter - heapBefore) / 1024 / 1024;

const checks = [
  { code: "average", ok: averageMs <= maxAverageMs, actual: averageMs, limit: maxAverageMs, unit: "ms" },
  { code: "p95", ok: p95Ms <= maxP95Ms, actual: p95Ms, limit: maxP95Ms, unit: "ms" },
  { code: "throughput", ok: requestsPerSecond >= minRequestsPerSecond, actual: requestsPerSecond, limit: minRequestsPerSecond, unit: "req/s" },
  { code: "heap", ok: heapGrowthMb <= maxHeapGrowthMb, actual: heapGrowthMb, limit: maxHeapGrowthMb, unit: "MB" }
];

const result = {
  ok: checks.every((check) => check.ok),
  iterations,
  warmupIterations,
  metrics: {
    elapsedMs: round(elapsedMs),
    averageMs: round(averageMs),
    p95Ms: round(p95Ms),
    requestsPerSecond: Math.round(requestsPerSecond),
    heapGrowthMb: round(heapGrowthMb)
  },
  checks: checks.map((check) => ({ ...check, actual: round(check.actual) }))
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return value;
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
