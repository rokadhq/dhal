# API stability

Dhal exposes public APIs through package exports in `package.json`.

Stable-intent imports heading toward v1:

```ts
import { createDhal } from "@rokadhq/dhal";
import { dhal } from "@rokadhq/dhal/express";
import { dhalFastify } from "@rokadhq/dhal/fastify";
import { createNodeHttpDhal } from "@rokadhq/dhal/node-http";
import { runDhalDoctor } from "@rokadhq/dhal/doctor";
import { runDhalReadiness } from "@rokadhq/dhal/readiness";
import { getDhalCompatibilityMatrix } from "@rokadhq/dhal/compatibility";
```

The product name remains Dhal. The CLI remains `dhal`. The config file remains `dhal.json`.

Before v1, any breaking import/config/CLI change should include:

- migration note in `UPGRADING.md`
- changelog entry
- compatibility note
- replacement API or deprecation path where possible
