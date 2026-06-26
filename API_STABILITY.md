# API stability

Dhal `1.0.0` is the stable public v1 contract.

The authoritative machine-readable contract is available from:

```ts
import {
  DHAL_V1_PUBLIC_EXPORTS,
  DHAL_V1_CLI_COMMANDS,
  getDhalV1Contract,
  validateDhalV1Contract
} from "@rokadhq/dhal/v1-contract";
```

Stable v1 imports include:

```ts
import { createDhal } from "@rokadhq/dhal";
import { dhal } from "@rokadhq/dhal/express";
import { dhalFastify } from "@rokadhq/dhal/fastify";
import { createNodeHttpDhal } from "@rokadhq/dhal/node-http";
import { runDhalDoctor } from "@rokadhq/dhal/doctor";
import { runDhalReadiness } from "@rokadhq/dhal/readiness";
import { runDhalReleaseCheck } from "@rokadhq/dhal";
import { getDhalCompatibilityMatrix } from "@rokadhq/dhal/compatibility";
import { migrateDhalConfig } from "@rokadhq/dhal/migrations";
```

The product name remains Dhal. The CLI remains `dhal`. The configuration file remains `dhal.json`, with `schemaVersion: "1"`.

## Compatibility policy

Within the stable v1 line:

- stable exports must not be removed or renamed without a major release;
- stable CLI command names remain available throughout v1.x;
- schema version 1 changes must remain backward compatible;
- deprecated APIs require documentation, a replacement path, and migration guidance;
- experimental surfaces may evolve within v1.x while they remain explicitly labelled experimental.

AI-assisted autosetup remains experimental and is not part of the stable v1 compatibility guarantee.
