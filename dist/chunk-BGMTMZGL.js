// src/telemetry/webhook.ts
import { createHmac, randomUUID } from "crypto";
var WebhookDhalTelemetry = class {
  constructor(config) {
    this.config = config;
  }
  config;
  recordDecision(event) {
    if (!this.config.emitAllowedRequests && event.decision.action === "allow" && !event.decision.wouldBlock) {
      return;
    }
    if (!this.config.enabled || this.config.urls.length === 0) return;
    for (const url of this.config.urls) {
      void this.send(url, event).catch(() => {
      });
    }
  }
  async send(url, event) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const payload = { type: "dhal.security_event", ...event };
    const body = JSON.stringify(payload);
    const headers = {
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
};
function addSignatureHeaders(headers, body, eventId, signing) {
  if (!signing.enabled) return;
  const secret = process.env[signing.secretEnv];
  if (!secret) return;
  const timestamp = String(Math.floor(Date.now() / 1e3));
  const id = eventId || randomUUID();
  const signedPayload = `${timestamp}.${id}.${body}`;
  const digest = createHmac("sha256", secret).update(signedPayload).digest("hex");
  headers[signing.timestampHeader] = timestamp;
  headers[signing.idHeader] = id;
  headers[signing.signatureHeader] = `v1=${digest}`;
}

export {
  WebhookDhalTelemetry
};
