"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/telemetry/webhook.ts
var webhook_exports = {};
__export(webhook_exports, {
  WebhookDhalTelemetry: () => WebhookDhalTelemetry
});
module.exports = __toCommonJS(webhook_exports);
var import_node_crypto = require("crypto");

// src/compatibility.ts
var DHAL_PACKAGE_VERSION = "1.0.0";

// src/telemetry/webhook.ts
var WebhookDhalTelemetry = class {
  constructor(config, options = {}) {
    this.config = config;
    this.maxPending = positiveInteger(options.maxPending, 1e3, "maxPending");
    this.defaultFlushTimeoutMs = positiveInteger(options.defaultFlushTimeoutMs, 5e3, "defaultFlushTimeoutMs");
  }
  config;
  pending = /* @__PURE__ */ new Set();
  maxPending;
  defaultFlushTimeoutMs;
  delivered = 0;
  failed = 0;
  dropped = 0;
  closed = false;
  recordDecision(event) {
    if (!this.config.emitAllowedRequests && event.decision.action === "allow" && !event.decision.wouldBlock) {
      return;
    }
    if (!this.config.enabled || this.config.urls.length === 0) return;
    for (const url of this.config.urls) {
      if (this.closed || this.pending.size >= this.maxPending) {
        this.dropped += 1;
        continue;
      }
      let task;
      task = this.send(url, event).then(() => {
        this.delivered += 1;
      }).catch(() => {
        this.failed += 1;
      }).finally(() => {
        this.pending.delete(task);
      });
      this.pending.add(task);
    }
  }
  async flush(timeoutMs = this.defaultFlushTimeoutMs) {
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
  async close(timeoutMs = this.defaultFlushTimeoutMs) {
    this.closed = true;
    await this.flush(timeoutMs);
  }
  getHealth() {
    return {
      pending: this.pending.size,
      delivered: this.delivered,
      failed: this.failed,
      dropped: this.dropped,
      closed: this.closed
    };
  }
  async send(url, event) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    timeout.unref?.();
    const payload = { type: "dhal.security_event", ...event };
    const body = JSON.stringify(payload);
    const headers = {
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
};
function addSignatureHeaders(headers, body, eventId, signing) {
  if (!signing.enabled) return;
  const secret = process.env[signing.secretEnv];
  if (!secret) return;
  const timestamp = String(Math.floor(Date.now() / 1e3));
  const id = eventId || (0, import_node_crypto.randomUUID)();
  const signedPayload = `${timestamp}.${id}.${body}`;
  const digest = (0, import_node_crypto.createHmac)("sha256", secret).update(signedPayload).digest("hex");
  headers[signing.timestampHeader] = timestamp;
  headers[signing.idHeader] = id;
  headers[signing.signatureHeader] = `v1=${digest}`;
}
function positiveInteger(value, fallback, name) {
  if (value === void 0) return fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be an integer >= 1.`);
  return value;
}
async function withTimeout(promise, timeoutMs, createError) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timeout = setTimeout(() => reject(createError()), timeoutMs);
        timeout.unref?.();
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WebhookDhalTelemetry
});
