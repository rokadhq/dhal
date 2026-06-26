import http from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { AbuseIpDbProvider } from "../src/reputation/abuseipdb.js";
import { IpReputationCache } from "../src/reputation/cache.js";
import type { IpReputationResult } from "../src/types.js";

describe("IP reputation production resilience", () => {
  it("retries one transient response within the configured timeout budget", async () => {
    let requests = 0;
    const server = http.createServer((_request, response) => {
      requests += 1;
      if (requests === 1) {
        response.statusCode = 503;
        response.setHeader("retry-after", "0");
        response.end();
        return;
      }

      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        data: {
          ipAddress: "203.0.113.9",
          abuseConfidenceScore: 87,
          totalReports: 12,
          countryCode: "IN"
        }
      }));
    });

    server.listen(0);
    await once(server, "listening");

    try {
      const provider = providerFor(server, 1_000);
      const result = await provider.check("203.0.113.9");

      expect(requests).toBe(2);
      expect(result.score).toBe(87);
      expect(result.totalReports).toBe(12);
      expect(result.countryCode).toBe("IN");
    } finally {
      await closeServer(server);
    }
  });

  it("does not retry indefinitely when the provider remains unavailable", async () => {
    let requests = 0;
    const server = http.createServer((_request, response) => {
      requests += 1;
      response.statusCode = 503;
      response.end();
    });

    server.listen(0);
    await once(server, "listening");

    try {
      await expect(providerFor(server, 500).check("203.0.113.10")).rejects.toThrow(/503/);
      expect(requests).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  it("bounds cache entries and concurrent asynchronous lookups", () => {
    const cache = new IpReputationCache({ maxEntries: 2, maxInFlight: 2 });
    cache.set("203.0.113.1", result("203.0.113.1"));
    cache.set("203.0.113.2", result("203.0.113.2"));
    cache.set("203.0.113.3", result("203.0.113.3"));

    expect(cache.size()).toBe(2);
    expect(cache.get("203.0.113.1")).toBeUndefined();
    expect(cache.get("203.0.113.2")).toBeDefined();
    expect(cache.get("203.0.113.3")).toBeDefined();

    expect(cache.markInFlight("203.0.113.4")).toBe(true);
    expect(cache.markInFlight("203.0.113.5")).toBe(true);
    expect(cache.markInFlight("203.0.113.6")).toBe(false);
    expect(cache.markInFlight("203.0.113.4")).toBe(false);
    cache.clearInFlight("203.0.113.4");
    expect(cache.markInFlight("203.0.113.6")).toBe(true);
  });
});

function providerFor(server: http.Server, timeoutMs: number): AbuseIpDbProvider {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP address");
  return new AbuseIpDbProvider({
    apiKey: "test-key",
    cacheTtlSeconds: 60,
    maxAgeInDays: 30,
    timeoutMs,
    endpoint: `http://127.0.0.1:${address.port}/check`
  });
}

function result(ip: string): IpReputationResult {
  return {
    ip,
    provider: "test",
    score: 0,
    checkedAt: Date.now(),
    expiresAt: Date.now() + 60_000
  };
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
