# Dhal Security Notes

Dhal is an application-layer request security middleware. It is designed to complement an edge/CDN/network WAF, not replace it.

## Strong uses

- Route-aware rate limiting
- IPv4/IPv6 CIDR allow/block lists
- Suspicious user-agent blocking
- Rule-pack based SQLi/XSS/path traversal/SSRF/RCE/SSTI/GraphQL/WordPress probe detection
- Payload-size enforcement
- Positive security model for JSON APIs
- Header anomaly detection
- Content-Type/body mismatch checks
- IP reputation checks with caching
- Structured security telemetry
- Monitor-mode production rollout
- Bot-like request scoring
- Honeypot canaries
- Login-failure based credential-stuffing detection
- Security webhooks into SIEM, Slack gateways, or Anubase security agents
- Distributed credential-failure signals through Redis/Valkey
- HMAC-signed webhook payloads for receiver verification
- JSON schema export for config review and editor validation
- Policy severity mapping, audit explanations, sampling, and suppressions
- False-positive replay through `dhal replay`
- AI-assisted setup through `dhal autosetup`
- CI posture checks through `dhal ci`

## Weak uses

Dhal cannot stop attacks before traffic reaches the Node.js process. Use upstream controls for:

- L3/L4 DDoS
- bandwidth exhaustion
- TLS negotiation attacks
- SYN floods
- volumetric bot floods

## AI autosetup guidance

`dhal autosetup` is a configuration assistant, not an autonomous production hardening authority.

Recommended workflow:

1. Run `dhal autosetup . --no-ai --json` first to inspect the deterministic proposal.
2. Run AI-assisted autosetup only after configuring a provider and model through the Vercel AI SDK ecosystem.
3. Write to `dhal.proposed.json` before overwriting `dhal.json`.
4. Review route profiles, especially `mode: "block"`, before deploying.
5. Run `dhal replay` with known-good traffic samples to catch false positives.

Autosetup intentionally does not inline provider API keys or secrets. Keep provider credentials in environment variables.

## Operational guidance

Start with global `monitor` mode. Move only high-confidence routes to `block`, such as `/api/login` or internal APIs.

Prefer route-specific profiles over a single aggressive global policy.

Use distributed Redis/Valkey rate limiting and signal storage for horizontally scaled deployments. The memory stores are suitable for local development, single-instance deployments, and tests.

Credential-stuffing detection depends on response outcomes. The included Express, Fastify, and raw `node:http` adapters record status codes automatically. If you use the core engine directly, call `engine.recordOutcome(request, { statusCode })` after your handler finishes.

## Rule-pack guidance

Rule packs are deterministic signature groups. They are useful, but they are not a substitute for domain-aware validation.

- `generic-web`: broad web probes and common injection patterns
- `api`: SSRF, GraphQL, JSON/API-oriented probes
- `auth`: credential-stuffing and login-route posture
- `wordpress`: WordPress-specific probes for apps that should not expose WordPress surfaces
- `strict-api`: aggressive API posture, best used per route after replay testing

Use `meta.confidence` as triage context. Do not treat confidence as a mathematical probability.

## Suppression guidance

Suppressions are policy exceptions, not rule changes. Keep them narrow, auditable, and time-bounded.

Good suppression:

```json
{
  "id": "known-validation-scanner",
  "enabled": true,
  "ruleId": "honeypot.triggered",
  "path": "/.well-known/test-canary",
  "reason": "temporary validation scanner",
  "expiresAt": "2999-01-01T00:00:00.000Z"
}
```

Avoid broad category-level suppressions unless you have compensating upstream controls.

## CI guidance

Run `dhal ci` in CI/CD and fail deployments when critical posture checks fail. Recommended production policy:

```json
{
  "policy": {
    "ci": {
      "failOnModes": ["off"],
      "requireWebhookSigning": true,
      "requireNonMonitorRouteForRules": ["credentialStuffing"],
      "disallowExpiredSuppressions": true
    }
  }
}
```

## Replay guidance

Use `dhal replay` with known-good production-like requests before turning on global or route-level block mode.

```bash
npx dhal replay fixtures.replay.json --config dhal.json
npx dhal replay fixtures.replay.json --config dhal.json --fail-on-block
```

## Performance rules

- Do not run remote IP reputation lookups synchronously unless the route is high-risk.
- Use async reputation mode for general traffic.
- Keep request body inspection bounded.
- Prefer narrow route-specific rules for expensive checks.
- Keep webhooks asynchronous and timeout-bounded. Enable webhook signing before sending security events to external systems.
- Use sampling for high-volume allowed traffic, not for blocked security findings.
- Avoid putting raw secrets or full tokens into identity fields. Use stable IDs or hashes.

## Privacy notes

Security events may include IP address, route, user-agent, user ID, tenant ID, and API key ID. Treat webhook destinations and logs as security-sensitive systems.

For enterprise deployments, prefer hashing or pseudonymous IDs for `userId`, `tenantId`, and `apiKeyId` where possible. Receivers should verify webhook timestamps, event IDs, and signatures to reduce replay risk.

## Release integrity

See `RELEASE_INTEGRITY.md` for recommended signed tags, provenance, tarball digest review, and consumer verification steps.
