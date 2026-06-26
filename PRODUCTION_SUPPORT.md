# Dhal Production Support Policy

This policy applies to the stable Dhal v1 release line.

## Supported release line

After `1.0.0` is published:

| Release line | Status |
| --- | --- |
| Latest stable `1.x` | Supported |
| Older `1.x` minors | Security and critical defect fixes for at least 90 days after the next minor release |
| Release candidates | Validation only; upgrade to the matching stable release |
| `0.x` releases | Unsupported after the stable v1 transition window |

The project may extend support windows in release notes for specific versions. A shorter window must not be applied retroactively.

## Compatibility guarantees

Within v1.x:

- stable package exports are not removed or renamed;
- stable CLI commands remain available;
- `schemaVersion: "1"` remains backward compatible;
- configuration defaults may be strengthened only when the change is safe, documented, and does not silently convert monitor behavior into blocking behavior;
- deprecations include a replacement, migration guidance, and at least one minor-release transition period;
- experimental APIs may evolve while they remain explicitly labelled experimental.

## Runtime support

Dhal v1 supports maintained Node.js release lines beginning with Node.js 20. The tested release matrix is published by `dhal compat` and enforced in CI.

Framework and integration support is limited to versions declared by the compatibility matrix. Applications using versions outside those ranges may work but are not covered by the production guarantee.

## Severity and response targets

These are maintainer response targets, not contractual service-level agreements:

| Severity | Example | Initial response target | Remediation target |
| --- | --- | --- | --- |
| Critical | Authentication bypass, remote code execution, universal protection bypass | 1 business day | Expedited patch as soon as safely validated |
| High | Reliable rule bypass, sensitive data exposure, unsafe default | 2 business days | Target 7 days |
| Medium | Limited bypass, denial-of-service edge case, significant compatibility defect | 5 business days | Target next patch or minor release |
| Low | Documentation, diagnostics, or low-impact correctness issue | Best effort | Planned release |

## Production adoption requirements

Before enabling blocking in production:

1. Run in monitor mode against representative traffic.
2. Run false-positive replay fixtures in CI.
3. Configure trusted proxy behavior explicitly.
4. Use Redis or Valkey for distributed rate limits and security signals in multi-instance deployments.
5. Configure telemetry redaction and webhook signing.
6. Define fail-open or fail-closed behavior for internal errors.
7. Maintain rollback access to the previously deployed application and Dhal version.

## What support does not cover

Dhal does not replace edge DDoS protection, TLS termination, host hardening, dependency security, authentication, authorization, or secure application design. Protection also depends on correct application integration and configuration.
