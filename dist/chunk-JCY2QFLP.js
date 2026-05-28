// src/telemetry/otel.ts
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

export {
  OpenTelemetryDhalTelemetry
};
