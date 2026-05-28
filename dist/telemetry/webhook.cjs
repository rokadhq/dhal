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
  const id = eventId || (0, import_node_crypto.randomUUID)();
  const signedPayload = `${timestamp}.${id}.${body}`;
  const digest = (0, import_node_crypto.createHmac)("sha256", secret).update(signedPayload).digest("hex");
  headers[signing.timestampHeader] = timestamp;
  headers[signing.idHeader] = id;
  headers[signing.signatureHeader] = `v1=${digest}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WebhookDhalTelemetry
});
