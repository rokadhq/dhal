# Dhal beta policy

Dhal `0.12.0-beta.0` is the first v1-readiness beta track release.

Beta means:

- The package is suitable for broader public testing and cautious production trials.
- Public import paths should be treated as stabilizing.
- CLI commands should be treated as stabilizing.
- `dhal.json` keys should not be renamed or removed without migration guidance.
- Breaking changes before v1 must be documented in `UPGRADING.md` and `CHANGELOG.md`.

Recommended beta usage:

```bash
npm install @rokadhq/dhal@beta
npx dhal readiness --production
npx dhal doctor
npx dhal replay fixtures.replay.json
```

Use monitor mode globally, then promote high-confidence route profiles to `block` or `strict` after false-positive review.
