import http from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config.js";
import { WebhookDhalTelemetry } from "../src/telemetry/webhook.js";
import type { DhalSecurityEvent } from "../src/types.js";

const event: DhalSecurityEvent = {
  eventId: "webhook-resilience",
  timestamp: new Date().toISOString(),
  request: { method: "GET", path: "/.env", route: "/.env", ip: "203.0.113.8" },
  decision: {
    action: "block",
    statusCode: 403,
    reason: "Honeypot triggered",
    ruleId: "honeypot.triggered",
    score: 100,
    severity: "critical"
  },
  ruleCategory: "honeypot",
  severity: "critical",
  durationMs: 0.2
};

describe("webhook production resilience", () => {
  it("retries one transient delivery failure", async () => {
    let requests = 0;
    let resolveDelivered!: () => void;
    const delivered = new Promise<void>((resolve) => {
      resolveDelivered = resolve;
    });
    const server = http.createServer((_request, response) => {
      requests += 1;
      if (requests === 1) {
        response.statusCode = 503;
        response.setHeader("retry-after", "0");
        response.end();
        return;
      }
      response.statusCode = 204;
      response.end();
      resolveDelivered();
    });

    server.listen(0);
    await once(server, "listening");

    try {
      telemetryFor(server).recordDecision(event);
      await Promise.race([
        delivered,
        timeout(2_000, "Webhook retry did not complete")
      ]);
      expect(requests).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  it("caps concurrent requests and drops work beyond the bounded queue", async () => {
    let received = 0;
    let active = 0;
    let maxActive = 0;
    const server = http.createServer((_request, response) => {
      received += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      setTimeout(() => {
        active -= 1;
        response.statusCode = 204;
        response.end();
      }, 10);
    });

    server.listen(0);
    await once(server, "listening");

    try {
      const telemetry = telemetryFor(server);
      for (let index = 0; index < 300; index += 1) {
        telemetry.recordDecision({ ...event, eventId: `webhook-${index}` });
      }

      await waitFor(() => received === 264 && active === 0, 5_000);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(maxActive).toBeLessThanOrEqual(8);
      expect(received).toBe(264);
    } finally {
      await closeServer(server);
    }
  });
});

function telemetryFor(server: http.Server): WebhookDhalTelemetry {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP address");
  return new WebhookDhalTelemetry({
    ...defaultConfig.observability.webhooks,
    enabled: true,
    urls: [`http://127.0.0.1:${address.port}/events`],
    timeoutMs: 1_000
  });
}

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for webhook queue to drain");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function timeout(ms: number, message: string): Promise<never> {
  return new Promise((_resolve, reject) => setTimeout(() => reject(new Error(message)), ms));
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
