# Dhal support and maintenance policy

This policy applies to stable Dhal releases beginning with `1.0.0`.

## Supported release lines

Dhal follows semantic versioning.

- The current stable major release receives security fixes, correctness fixes, compatibility updates, and documentation corrections.
- Release candidates are supported only until the corresponding stable release is published.
- Prerelease builds are not covered by the stable compatibility guarantee.
- Unsupported release lines may continue to work, but they do not receive guaranteed fixes or compatibility validation.

For the v1 line, the minimum supported runtime is Node.js 20. Node.js 20, 22, and 24 are included in the release validation matrix.

## Compatibility commitments

Within v1.x:

- stable package exports will not be removed or renamed;
- stable CLI command names will remain available;
- `dhal.json` schema version `1` changes will remain backward compatible;
- security-event fields may gain optional properties, but existing stable fields will not be removed;
- experimental surfaces may evolve while they remain explicitly labelled experimental.

## Deprecation policy

A stable API scheduled for removal will:

1. be documented as deprecated;
2. include a supported replacement or migration path;
3. remain available for at least one minor release;
4. be removed only in a new major release, except when retaining it would create a material security vulnerability.

## Security fixes

Security issues should be reported privately through GitHub Security Advisories for `rokadhq/dhal`. Do not open a public issue containing exploitable details.

Maintainers target the following initial response windows:

- critical: acknowledge within 2 business days;
- high: acknowledge within 3 business days;
- medium or low: acknowledge within 5 business days.

These are response targets, not contractual service-level agreements. Coordinated disclosure timing depends on severity, exploitability, affected versions, and fix validation.

## General support

Use GitHub Issues for reproducible defects and GitHub Discussions for integration or design questions. Include:

- exact Dhal version;
- Node.js and framework version;
- relevant `dhal.json` sections with secrets removed;
- output from `dhal doctor`, `dhal readiness --production`, and a redacted `dhal report`;
- a minimal reproduction when possible.

Dhal is provided under the MIT License. Enterprise support, architecture reviews, or implementation assistance are separate commercial services and are not implied by the open-source support policy.
