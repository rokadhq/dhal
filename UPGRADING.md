# Upgrading Dhal

## From v0.11 alpha to v0.12 beta

Install the beta tag explicitly:

```bash
npm install @rokadhq/dhal@beta
```

New commands:

```bash
npx dhal readiness --production
npx dhal compat
```

New public APIs:

```ts
import { runDhalReadiness } from "@rokadhq/dhal/readiness";
import { getDhalCompatibilityMatrix } from "@rokadhq/dhal/compatibility";
```

No breaking config change is required from v0.11 alpha to v0.12 beta.

Recommended post-upgrade checks:

```bash
npx dhal test-config
npx dhal doctor
npx dhal readiness --production
npx dhal replay fixtures.replay.json
```
