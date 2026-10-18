# Daily guides

One guide per file: `<slug>.ts`, default-exporting a `Guide` (see `../guides.ts`).
Files here are picked up automatically by `GUIDES`, the `/guides` hub and the sitemap.

```ts
import type { Guide } from "../guides";

const guide: Guide = { slug: "...", kind: "guide", /* ... */ };
export default guide;
```

Written by the daily guide agent and merged by hand. A slug that already exists
in the core list is ignored.
