# Security policy

Dhal is application-layer security middleware. It complements, but does not replace, CDN, edge, network firewall, TLS, authentication, authorization, input validation, and DDoS protections.

## Supported versions

Beginning with stable v1, the current stable major release receives security fixes and compatibility validation.

| Version | Supported |
| --- | --- |
| 1.x | Yes |
| 1.0.0 release candidates | Until stable 1.0.0 is published |
| 0.x | No, except for migration guidance |

See `SUPPORT_POLICY.md` for maintenance and deprecation commitments.

## Reporting vulnerabilities

Report suspected vulnerabilities privately through GitHub Security Advisories for `rokadhq/dhal`. Do not open a public issue containing exploitable details before a coordinated fix is available.

Include:

- affected Dhal version;
- Node.js and framework version;
- minimal reproduction;
- expected and observed behavior;
- exploitability and impact notes;
- whether the issue requires a specific configuration or deployment topology.

Do not include real production secrets, access tokens, customer data, or private traffic captures.

## Security boundaries

Dhal operates after a request reaches the Node.js application process. It cannot stop traffic that exhausts network bandwidth, TLS handshakes, kernel or socket resources, container limits, or infrastructure capacity before application execution.

Dhal does not provide authentication or authorization. A request allowed by Dhal must still pass the application’s identity, permission, validation, and business-rule checks.

## Secrets

Do not put API keys or signing secrets in `dhal.json`. Use environment variables or a managed secrets service.

Relevant examples include:

- `ABUSEIPDB_API_KEY`;
- `DHAL_WEBHOOK_SECRET`;
- AI provider credentials used by experimental autosetup tooling.

## Production behavior

Stable v1 refuses to start an enforcing deployment when a declared distributed or blocking security dependency is unavailable. This prevents silent downgrade to weaker controls.

Application event listeners and telemetry adapters are isolated from request decisions. Managed webhook telemetry is bounded and should be drained through `dhal.close()` during graceful shutdown.

## AI autosetup

AI-assisted autosetup remains experimental. It proposes or writes configuration but does not replace security review. Review generated configuration, route scopes, suppressions, and enforcement modes before production use.
