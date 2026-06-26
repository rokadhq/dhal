# Production deployment guide

This guide covers the minimum operational controls expected when deploying Dhal in a company production environment.

## 1. Start in monitor mode

Deploy Dhal with global `mode: "monitor"` first. Replay known-good traffic and review `wouldBlock` events before enabling enforcement.

Recommended promotion sequence:

1. monitor globally;
2. enable `block` on one low-risk route profile;
3. review false positives and latency;
4. expand enforcement route by route;
5. use `strict` only where fail-closed behavior is explicitly required.

Run before each enforcement change:

```bash
npx dhal test-config
npx dhal doctor
npx dhal readiness --production
npx dhal replay fixtures.replay.json
```

## 2. Use distributed stores for horizontally scaled applications

When more than one application instance serves the same routes, use Redis or Valkey for rate-limit and credential-stuffing state.

Dhal stable v1 refuses to start an enforcing deployment that declares `rateLimit.store: "redis"` without receiving a distributed `rateLimitStore` implementation. This prevents accidental per-instance limits from silently replacing the intended shared control.

Use separate key prefixes for environments and applications. Apply datastore authentication, network isolation, TLS where supported, and eviction policies appropriate for security counters.

## 3. Configure blocking dependencies explicitly

Blocking IP reputation requires an available provider. An enforcing deployment will refuse to start when blocking reputation is configured but its provider is unavailable.

Prefer asynchronous reputation checks for general public traffic. Reserve blocking reputation for routes where the latency and dependency failure mode are acceptable.

Never place API keys in `dhal.json`. Supply them through environment variables or a secrets manager.

## 4. Handle graceful shutdown

Dhal exposes lifecycle methods for production shutdown:

```ts
const dhal = createDhal({ configPath: "dhal.json" });

async function shutdown(signal: string) {
  console.log(`Received ${signal}; draining Dhal telemetry.`);
  await dhal.close(5_000);
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
```

`close()` stops new inspections, drains managed telemetry, and removes application event listeners. `flush()` drains current telemetry without closing the engine.

## 5. Monitor runtime health

Use `getRuntimeSnapshot()` to expose operational metrics through your internal metrics system, not directly to the public internet.

```ts
const snapshot = dhal.getRuntimeSnapshot();
```

The snapshot includes:

- inspected, allowed, blocked, and would-block requests;
- internal rule errors;
- inspections exceeding the configured budget;
- application event-listener failures;
- synchronous telemetry adapter failures;
- pending, delivered, failed, and dropped managed telemetry deliveries;
- engine shutdown state.

Alert on sustained increases in internal errors, telemetry drops, over-budget inspections, or event-listener errors.

## 6. Protect telemetry delivery

Enable HMAC signing for webhook telemetry and rotate the signing secret through your secrets manager.

Webhook delivery is bounded to prevent unbounded application memory growth. When the pending-delivery ceiling is reached, new deliveries are dropped and the drop count is exposed through telemetry health.

Webhook receivers should:

- verify the timestamp, event ID, and HMAC signature;
- reject stale timestamps and replayed event IDs;
- return a 2xx response only after accepting the event;
- apply their own queueing, retry, and retention controls.

Dhal treats non-2xx responses as failed deliveries.

## 7. Configure proxy trust carefully

Set `trustProxy: true` only when requests arrive through a trusted reverse proxy that overwrites forwarding headers. Incorrect proxy trust can allow clients to spoof source IP addresses and weaken IP-based controls.

Restrict application ingress so direct traffic cannot bypass the trusted proxy.

## 8. Preserve upstream protections

Dhal runs inside the Node.js process. It does not replace:

- CDN or edge rate limiting;
- volumetric DDoS protection;
- TLS termination and certificate management;
- network firewalls and security groups;
- container, host, or Kubernetes security controls;
- authentication and authorization;
- application-level input validation.

Use Dhal as one application-layer control within a defense-in-depth architecture.

## 9. Deployment checklist

Before production enforcement, confirm:

- exact Dhal version is pinned;
- Node.js runtime is supported;
- `schemaVersion` is `"1"`;
- Redis or Valkey is configured for multi-instance state;
- blocking dependencies are available;
- webhook signing and observability redaction are enabled;
- false-positive fixtures pass;
- readiness score meets the company threshold;
- graceful shutdown calls `dhal.close()`;
- support reports exclude secrets;
- rollback to monitor mode is documented and tested.
