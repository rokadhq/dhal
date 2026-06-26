import { createHmac, randomUUID } from "node:crypto";
import { DHAL_PACKAGE_VERSION } from "../compatibility.js";
import type { DhalConfig, DhalSecurityEvent, DhalTelemetry } from "../types.js";

const MAX_IN_FLIGHT = 8;
const MAX_QUEUED = 256;
const MAX_ATTEMPTS = 2;
const MAX_RETRY_DELAY_MS = 250;
const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

type PendingWebhook = {
  url: string;
  event: DhalSecurityEvent;
};

export class WebhookDhalTelemetry implements DhalTelemetry {
  private readonly queue: PendingWebhook[] = [];
  private inFlight = 0;

  constructor(private readonly config: DhalConfig["observability"]["webhooks"]) {}

  recordDecision(event: DhalSecurityEvent): void {
    if (!this.config.emitAllowedRequests && event.decision.action === "allow" && !event.decision.wouldBlock) {
      return;
    }

    if (!this.config.enabled || this.config.urls.length === 0) return;

    for (const url of this.config.urls) {
      this.enqueue({ url, event });
    }
  }

  private enqueue(item: PendingWebhook): void {
    if (this.inFlight < MAX_IN_FLIGHT) {
      this.dispatch(item);
      return;
    }

    if (this.queue.length < MAX_QUEUED) {
      this.queue.push(item);
    }
    // Best-effort telemetry drops excess work rather than creating unbounded memory pressure.
  }

  private dispatch(item: PendingWebhook): void {
    this.inFlight += 1;
    void this.send(item.url, item.event)
      .catch(() => {
        // Webhooks are best-effort by design.
      })
      .finally(() => {
        this.inFlight -= 1;
        const next = this.queue.shift();
        if (next) this.dispatch(next);
      });
  }

  private async send(url: string, event: DhalSecurityEvent): Promise<void> {
    const payload = { type: "dhal.security_event", ...event };
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "user-agent": `dhal-webhook/${DHAL_PACKAGE_VERSION}`
    };
    addSignatureHeaders(headers, body, event.eventId, this.config.signing);

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.request(url, body, headers);
        if (response.ok) return;

        const error = new Error(`Dhal webhook request failed: ${response.status} ${response.statusText}`);
        if (!TRANSIENT_STATUS_CODES.has(response.status) || attempt === MAX_ATTEMPTS) throw error;

        lastError = error;
        await response.body?.cancel().catch(() => undefined);
        await sleep(retryDelay(response.headers.get("retry-after")));
      } catch (error) {
        lastError = error;
        if (attempt === MAX_ATTEMPTS || isAbortError(error)) break;
        await sleep(50);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Dhal webhook delivery failed");
  }

  private async request(url: string, body: string, headers: Record<string, string>): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      return await fetch(url, {
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

function retryDelay(header: string | null): number {
  if (!header) return 50;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, seconds * 1000));
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.min(MAX_RETRY_DELAY_MS, Math.max(0, date - Date.now())) : 50;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
