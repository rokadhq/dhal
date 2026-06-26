import { createHmac } from "node:crypto";
import http from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { DHAL_PACKAGE_VERSION } from "../src/compatibility.js";
import { defaultConfig } from "../src/config.js";
import { OpenTelemetryDhalTelemetry } from "../src/telemetry/otel.js";
import { WebhookDhalTelemetry } from "../src/telemetry/webhook.js";
import type { DhalSecurityEvent } from "../src/types.js";

const securityEvent: DhalSecurityEvent = {
  eventId: "event-v1-contract",
  timestamp: new Date().toISOString(),
  request: { method: "POST", path: "/api/login", route: "/api/login", ip: "203.0.113.7" },
  decision: {
    action: "block",
    statusCode: 403,
    reason: "Threshold exceeded",
    ruleId: "credential_stuffing.threshold_exceeded",
    score: 90,
    severity: "high"
  },
  ruleCategory: "credential_stuffing",
  severity: "high",
  durationMs: 0.25
};

describe("stable telemetry adapters", () => {
  it("emits a signed webhook with current package metadata", async () => {
    const envName = "DHAL_TEST_SIGNING_KEY";
    const signingKey = "test-only-value";
    process.env[envName] = signingKey;

    let receive!: (value: { headers: http.IncomingHttpHeaders; body: string }) => void;
    const requestReceived = new Promise<{ headers: http.IncomingHttpHeaders; body: string }>((resolve) => {
      receive = resolve;
    });
    const server = http.createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        receive({ headers: request.headers, body: Buffer.concat(chunks).toString("utf8") });
        response.statusCode = 204;
        response.end();
      });
    });

    server.listen(0);
    await once(server, "listening");

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP address");
      const telemetry = new WebhookDhalTelemetry({
        ...defaultConfig.observability.webhooks,
        enabled: true,
        urls: [`http://127.0.0.1:${address.port}/events`],
        timeoutMs: 2_000,
        signing: {
          ...defaultConfig.observability.webhooks.signing,
          enabled: true,
          secretEnv: envName
        }
      });

      telemetry.recordDecision(securityEvent);
      const captured = await requestReceived;
      const timestamp = String(captured.headers["x-dhal-timestamp"]);
      const expectedSignature = createHmac("sha256", signingKey)
        .update(`${timestamp}.${securityEvent.eventId}.${captured.body}`)
        .digest("hex");

      expect(captured.headers["user-agent"]).toBe(`dhal-webhook/${DHAL_PACKAGE_VERSION}`);
      expect(captured.headers["x-dhal-event-id"]).toBe(securityEvent.eventId);
      expect(captured.headers["x-dhal-signature"]).toBe(`v1=${expectedSignature}`);
    } finally {
      delete process.env[envName];
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("keeps OpenTelemetry optional and non-blocking", () => {
    const telemetry = new OpenTelemetryDhalTelemetry({ serviceName: "dhal-v1-test", emitAllowedRequests: true });
    expect(() => telemetry.recordDecision(securityEvent)).not.toThrow();
  });
});
