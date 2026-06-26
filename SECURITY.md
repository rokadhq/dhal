# Security Policy

Dhal is application-layer security middleware. It complements, but does not replace, CDN, edge, network firewall, TLS, host hardening, dependency security, authentication, authorization, and DDoS protections.

## Supported versions

After the stable v1 release, the supported line is:

| Version | Supported |
| --- | --- |
| Latest stable `1.x` | Yes |
| Older `1.x` minors within the published transition window | Security and critical fixes |
| `1.0.0-rc.x` | Validation only; upgrade to stable `1.0.0` |
| `0.x` | No, after the stable v1 transition window |

Detailed lifecycle and response targets are documented in `PRODUCTION_SUPPORT.md`.

## Reporting vulnerabilities

Report suspected vulnerabilities privately to the maintainers. Do not disclose exploitable details publicly until a fix or coordinated disclosure plan is available.

Include:

- affected Dhal version;
- Node.js and framework version;
- relevant `dhal.json` settings with secrets removed;
- minimal reproduction;
- expected and observed behavior;
- exploitability and impact notes;
- whether the issue reproduces in monitor, block, or strict mode.

Do not open a public issue containing an active exploit, secret, customer data, or unpatched bypass.

## Security response

Reports are triaged according to impact, exploitability, affected surface, and availability of mitigations. Critical and high-severity issues may result in an expedited patch, temporary configuration guidance, npm deprecation notice, or coordinated disclosure.

Security fixes must preserve the stable v1 contract unless a contract change is required to resolve an active vulnerability. Any emergency breaking change must be documented explicitly with a migration path.

## Security boundaries

Dhal operates after a request reaches the Node.js application process. It cannot stop traffic that exhausts network bandwidth, TLS handshakes, kernel or socket resources, reverse-proxy capacity, or infrastructure limits before application execution.

Dhal decisions depend on correctly resolved client identity, route metadata, request parsing, proxy trust, and application integration. Incorrect `trustProxy`, body-parser, adapter, or route-order configuration can reduce protection.

## Secrets and sensitive data

Do not put API keys or signing secrets in `dhal.json`. Use environment variables such as `ABUSEIPDB_API_KEY`, `DHAL_WEBHOOK_SECRET`, or provider-specific variables.

Keep redaction enabled for production telemetry. Support reports are designed to omit secret values, but operators must still review generated files before sharing them externally.

## Experimental functionality

AI-assisted autosetup remains experimental. It proposes or writes reviewable configuration and must not be treated as an autonomous security authority. Review generated configuration before enabling blocking mode.
