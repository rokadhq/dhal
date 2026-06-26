import { createHmac, randomUUID } from "node:crypto";
import { DHAL_PACKAGE_VERSION } from "../compatibility.js";
import type { DhalConfig, DhalSecurityEvent } from "../types.js";
import type { DhalManagedTelemetry, DhalTelemetryHealth } from "./lifecycle.js";

export type WebhookDhalTelemetryOptions = {
  maxPending?: number;
  defaultFlushTimeoutMs?: number;
};

export class WebhookDhalTelemetry implements DhalManagedTelemetry {
  private readonly pending = new Set<Promise<void>>();
  private readonly maxPending: number;
  private readonly defaultFlushTimeoutMs: number;
  private delivered = 0;
  private failed = 0;
  private dropped = 0;
  private closed = false;

  constructor(
    private readonly config: DhalConfig["observability"]["webhooks"],
    options: WebhookDhalTelemetryOptions = {}
  ) {
    this.maxPending = positiveInteger(options.maxPending, 1_000, "maxPending");
    this.defaultFlushTimeoutMs = positiveInteger(options.defaultFlushTimeoutMs, 5_000, "defaultFlushTimeoutMs");
  }

  recordDecision(event: DhalSecurityEvent): void {
    if (!this.config.emitAllowedRequests && event.decision.action === "allow" && !event.decision.wouldBlock) {
      return;
    }

    if (!this.config.enabled || this.config.urls.length === 0) return;

    for (const url of this.config.urls) {
      if (this.closed || this.pending.size >= this.maxPending) {
        this.dropped += 1;
        continue;
      }

      let task!: Promise<void>;
      task = this.send(url, event)
        .then(() => {
          this.delivered += 1;
        })
        .catch(() => {
          this.failed += 1;
        })
        .finally(() => {
          this.pending.delete(task);
        });
      this.pending.add(task);
    }
  }

  async flush(timeoutMs = this.defaultFlushTimeoutMs): Promise<void> {
    const deadline = Date.now() + positiveInteger(timeoutMs, this.defaultFlushTimeoutMs, "timeoutMs");

    while (this.pending.size > 0) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new Error(`Timed out while draining ${this.pending.size} pending Dhal webhook request(s).`);
      }

      const drain = Promise.allSettled([...this.pending]);
      await withTimeout(drain, remainingMs, () => new Error(`Timed out while draining ${this.pending.size} pending Dhal webhook request(s).`));
    }
  }

  async close(timeoutMs = this.defaultFlushTimeoutMs): Promise<void> {
    this.closed = true;
    await this.flush(timeoutMs);
  }

  getHealth(): DhalTelemetryHealth {
    return {
      pending: this.pending.size,
      delivered: this.delivered,
      failed: this.failed,
      dropped: this.dropped,
      closed: this.closed
    };
  }

  private async send(url: string, event: DhalSecurityEvent): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    timeout.unref?.();
    const payload = { type: "dhal.security_event", ...event };
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "user-agent": `dhal-webhook/${DHAL_PACKAGE_VERSION}`
    };

    addSignatureHeaders(headers, body, event.eventId, this.config.signing);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Dhal webhook endpoint returned HTTP ${response.status}.`);
      }
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

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be an integer >= 1.`);
  return value;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, createError: () => Error): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(createError()), timeoutMs);
        timeout.unref?.();
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
