# Security Policy

Dhal is application-layer security middleware. It complements, but does not replace, CDN, edge, network firewall, TLS, and DDoS protections.

## Supported versions

Until the first stable release, only the latest published minor version is supported.

| Version | Supported |
| --- | --- |
| 0.8.x | Yes |
| < 0.8 | No |

## Reporting vulnerabilities

Report suspected vulnerabilities privately to the package maintainer. Do not disclose exploitable details publicly until a fix is available.

Include:

- affected Dhal version
- runtime and framework version
- minimal reproduction
- expected behavior
- observed behavior
- exploitability notes

## Security boundaries

Dhal operates after a request reaches the Node.js application process. It cannot stop traffic that exhausts network bandwidth, TLS handshakes, kernel/socket resources, or infrastructure limits before application execution.

## Secrets

Do not put API keys in `dhal.json`. Use environment variables such as `ABUSEIPDB_API_KEY`, `OPENAI_API_KEY`, or provider-specific variables.

The AI autosetup command is designed to propose or write configuration. Review generated config before enabling blocking mode in production.
