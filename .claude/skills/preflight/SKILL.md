---

name: preflight
description: Run the local fast pre-flight (lint, check-types, check:laws, tests for changed packages) from AGENTS.md section 5 and report real results
disable-model-invocation: true
---

Run these from the repo root, in order, and do not skip any. Stop at the first failure, fix it, then restart from step 1.

```bash
bun run lint
bun run check-types
bun run check:laws
```

Then run the tests for the packages the change touches only, for example `bunx vitest run <paths>` or `bun run test --filter=<package>`. Do not run the whole monorepo test suite or `bun run build` locally: CI runs the full tests, the build, Storybook a11y, the E2E smoke test and the Docker images on the PR.

If `check:laws` reports stale baselines after a change that removed violations, regenerate them with the three `--write-baseline` scripts named in AGENTS.md section 5.

Note: `bun run lint` is check-only (`biome ci`) and never modifies files. If it reports formatting or lint errors, `bun run lint:fix` applies the safe fixes locally; check `git status` afterwards and mention any auto-fixes.

Report a table of the steps with pass/fail and the actual error output for any failure. Never claim a pass you did not observe. Do not commit, push or open a PR; this skill only verifies. After a push, the PR is ready only when every CI check on its latest commit is green.
