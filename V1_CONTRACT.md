# Dhal v1 Contract Hardening

Dhal `1.0.0-rc.0` freezes the first stable v1 configuration and public API contract.

## Configuration schema

All generated configs now include:

```json
{
  "schemaVersion": "1"
}
```

`schemaVersion: "1"` is the target configuration contract for the first stable `v1.0.0` release. Existing configs without `schemaVersion` are treated as pre-v0.13 configs and can be normalized with:

```bash
npx dhal migrate dhal.json --write
```

Check whether a config needs migration:

```bash
npx dhal migrate dhal.json --check
```

## Public API stability

Inspect public API stability labels:

```bash
npx dhal stability
```

Stable-for-v1 surfaces include the core engine, Express adapter, Fastify adapter, raw `node:http` adapter, CLI command names, and `schemaVersion: "1"` configuration model.

Experimental surfaces include AI autosetup internals and internal rule scoring weights.

## Release guidance

For beta users:

1. Pin exact versions for production trials.
2. Run `npx dhal migrate --check` before upgrades.
3. Run `npx dhal readiness --production` before enforcement.
4. Use monitor mode first, then route-level block mode.
5. File issues with `npx dhal report --output dhal.report.json`.
