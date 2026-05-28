# Dhal Release Integrity Notes

Dhal v0.7 is still a starter package, but the release process should already follow supply-chain hygiene.

## Recommended release workflow

1. Build from a clean working tree.
2. Run `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run benchmark`, and `npm audit --omit=dev`.
3. Generate package contents with `npm pack --dry-run` and review included files.
4. Publish with npm provenance enabled where your CI provider supports it.
5. Attach the package tarball SHA-256 digest to the GitHub release notes.
6. Tag releases with signed Git tags.

## Consumer verification

Consumers should pin exact versions for production workloads, review `dhal.schema.json` changes during upgrades, and run `dhal ci` in their deployment pipeline.

## Webhook integrity

When security events are sent outside the app boundary, enable HMAC signing:

```json
{
  "observability": {
    "webhooks": {
      "enabled": true,
      "signing": {
        "enabled": true,
        "secretEnv": "DHAL_WEBHOOK_SECRET"
      }
    }
  }
}
```

Receivers should verify the timestamp, event ID, and signature before trusting the event payload.
