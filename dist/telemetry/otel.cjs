"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/telemetry/otel.ts
var otel_exports = {};
__export(otel_exports, {
  OpenTelemetryDhalTelemetry: () => OpenTelemetryDhalTelemetry
});
module.exports = __toCommonJS(otel_exports);
var OpenTelemetryDhalTelemetry = class {
  constructor(options) {
    this.options = options;
  }
  options;
  apiPromise;
  recordDecision(event) {
    if (!this.options.emitAllowedRequests && event.decision.action === "allow" && !event.decision.wouldBlock) {
      return;
    }
    void this.loadApi().then((api) => {
      if (!api) return;
      const tracer = api.trace.getTracer("dhal", "0.8.0");
      const meter = api.metrics.getMeter("dhal", "0.8.0");
      const attributes = toAttributes(event, this.options.serviceName);
      const span = tracer.startSpan("dhal.inspect", { attributes });
      span.setStatus({
        code: event.decision.action === "block" || event.decision.wouldBlock ? api.SpanStatusCode.ERROR : api.SpanStatusCode.OK,
        message: event.decision.reason
      });
      span.end();
      meter.createCounter("dhal.requests.total").add(1, attributes);
      if (event.decision.action === "block" || event.decision.wouldBlock) {
        meter.createCounter("dhal.blocked_requests.total").add(1, attributes);
      }
      meter.createHistogram("dhal.inspection.duration_ms").record(event.durationMs, attributes);
    }).catch(() => {
    });
  }
  loadApi() {
    this.apiPromise ??= import("@opentelemetry/api").catch(() => void 0);
    return this.apiPromise;
  }
};
function toAttributes(event, serviceName) {
  return {
    "service.name": serviceName,
    "http.request.method": event.request.method,
    "url.path": event.request.path,
    "dhal.event_id": event.eventId,
    "dhal.correlation_id": event.correlationId ?? "none",
    "dhal.action": event.decision.action,
    "dhal.would_block": Boolean(event.decision.wouldBlock),
    "dhal.rule_id": event.decision.ruleId ?? "none",
    "dhal.rule_category": event.ruleCategory,
    "dhal.threat_kind": event.threatKind ?? "none",
    "dhal.severity": event.severity,
    "dhal.suppressed": event.decision.meta?.suppressed === true,
    "dhal.reason": event.decision.reason,
    "dhal.score": event.decision.score,
    "dhal.route": event.request.route ?? event.request.path,
    "dhal.duration_ms": event.durationMs
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OpenTelemetryDhalTelemetry
});
