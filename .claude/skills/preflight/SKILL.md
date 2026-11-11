---

name: preflight
description: Run the mandatory 4-step CI pre-flight (lint, check-types, test, build) from AGENTS.md section 5 and report real results
disable-model-invocation: true
---

Run these from the repo root, in order, and do not skip any. Stop at the first failure, fix it, then restart from step 1.

```bash
bun run lint
bun run check-types
bun run test
bun run build
```

Note: `bun run lint` runs `biome check --write`, so it may modify files. Check `git status` afterwards and mention any auto-fixes.

Report a table of the four steps with pass/fail and the actual error output for any failure. Never claim a pass you did not observe. Do not commit, push or open a PR; this skill only verifies.
