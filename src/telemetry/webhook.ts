import { createHmac, randomUUID } from "node:crypto";
import type { DhalConfig, DhalSecurityEvent, DhalTelemetry } from "../types.js";

export class WebhookDhalTelemetry implements DhalTelemetry {
  constructor(private readonly config: DhalConfig["observability"]["webhooks"]) {}

  recordDecision(event: DhalSecurityEvent): void {
    if (!this.config.emitAllowedRequests && event.decision.action === "allow" && !event.decision.wouldBlock) {
      return;
    }

    if (!this.config.enabled || this.config.urls.length === 0) return;

    for (const url of this.config.urls) {
      void this.send(url, event).catch(() => {
        // Webhooks are best-effort by design.
      });
    }
  }

  private async send(url: string, event: DhalSecurityEvent): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const payload = { type: "dhal.security_event", ...event };
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "user-agent": "dhal-webhook/0.8.0"
    };

    addSignatureHeaders(headers, body, event.eventId, this.config.signing);

    try {
      await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function addSignatureHeaders(
  headers: Record<string, string>,
  body: string,
  eventId: string | undefined,
  signing: DhalConfig["observability"]["webhooks"]["signing"]
): void {
  if (!signing.enabled) return;

  const secret = process.env[signing.secretEnv];
  if (!secret) return;

  const timestamp = String(Math.floor(Date.now() / 1000));
  const id = eventId || randomUUID();
  const signedPayload = `${timestamp}.${id}.${body}`;
  const digest = createHmac("sha256", secret).update(signedPayload).digest("hex");

  headers[signing.timestampHeader] = timestamp;
  headers[signing.idHeader] = id;
  headers[signing.signatureHeader] = `v1=${digest}`;
}
