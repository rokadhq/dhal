# Dhal alpha-public policy

Dhal is now public and usable, but it is still pre-1.0.

## Stability posture

- Product name: Dhal
- npm package: `@rokadhq/dhal`
- CLI: `dhal`
- config file: `dhal.json`
- recommended install range for public users: pin exact versions during alpha
- recommended first mode: `monitor`
- recommended enforcement path: move route profiles to `block` gradually

## Runtime safety defaults

Dhal defaults to availability-first behavior:

- internal Dhal errors fail open by default
- health/readiness/liveness paths can bypass inspection
- `OPTIONS` can bypass inspection for preflight compatibility
- observability event data is redacted by default

## Before enabling block mode

Run:

```bash
npx dhal doctor
npx dhal rules
npx dhal simulate fixtures.simulation.json
npx dhal replay fixtures.replay.json
npx dhal ci
```

For production, prefer route-level `block` mode over a global switch.

## Public issue reports

Use:

```bash
npx dhal report --output dhal.report.json
```

Review the report before sharing it publicly. Dhal does not include secret values in this report, but route names and config posture can still reveal operational details.
