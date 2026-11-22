# Laws: detail

The full text of sections 9, 11, 16 and 17 of [`AGENTS.md`](../../AGENTS.md), moved here word for word on 22 November 2026 to keep `AGENTS.md` short. `AGENTS.md` keeps the rules; this page keeps the explanation.

## 9. DEPENDENCY VERSIONS

- A dependency declared in two or more workspace `package.json` files (root, `apps/*`, `packages/*`) must use the same version string everywhere. `bun scripts/check-dependency-versions.ts` enforces this in `check:laws` (and so in CI); peerDependencies ranges are not compared. Deliberate exceptions go in `ALLOWED_MISMATCHES` in `scripts/lib/dependency-versions.ts`, each with a reason and with sign-off first (section 15).
- Renovate groups non-major updates into one PR and raises major updates one PR per package; each covers every workspace that declares the package. When bumping by hand, bump every workspace together.
- Bun catalogs (`workspaces.catalog` and `"catalog:"` references) are deferred: Renovate's bun manager does not extract catalog entries ([`lib/modules/manager/bun/extract.ts`](https://github.com/renovatebot/renovate/blob/main/lib/modules/manager/bun/extract.ts) only reads `workspaces.packages`), so catalog versions would never get upgrade PRs. Revisit when Renovate adds support.

## 11. COPY LAW

> **Detailed Reference**: Before writing or changing any string a user or a model reads (web, marketing, `packages/ui`, finance-engine text, MCP descriptions, prompts and results), read [`docs/copy/COPY-GUIDE.md`](../copy/COPY-GUIDE.md).

- **How it fits with the UX guidelines.** [`docs/ux/UX-GUIDELINES.md`](../ux/UX-GUIDELINES.md) says how a screen behaves; the copy guide says what its words are. Where both cover a pattern (empty states, errors, destructive actions), the UX guidelines decide the behaviour and the copy guide decides the wording.
- **Plain, factual, even-handed.** Everyday words, sentences of 25 words at most, sentence case, en-GB, no exclamation marks, em dashes or ampersands. One approved word per concept (guide section 6): "debts" not "liabilities", "what you own" not "assets", "left over each month" not "surplus", "estimate" for anything computed about the future or tax.
- **Never judge anyone's finances** (owner rule, guide 2.3): no "only" or "just" about money, no ranking renting below owning, no deprivation statistics at the reader, no red or warnings for ordinary situations.
- **Facts, not recommendations.** The advice boundary policy (`docs/compliance/advice-boundary-policy.md`, R1 to R8) and the claims rule (E7) outrank everything; the guide restates them in section 7. Fixed wording (notices, the MoneyHelper line, regulatory statements; guide 7.3) is never reworded without the owner.
- **Guard.** `bun scripts/check-copy.ts` (part of `check:laws`) is a ratchet over `scripts/copy-baseline.json`. `--list <path>` prints the hits under a path. After fixing copy, run `--write-baseline` and commit it. A false positive goes in `ALLOWED_PHRASES` with a reason and with sign-off first (section 15).

## 16. ONE HOME PER VALUE LAW

> **Detailed Reference**: Before adding, moving or removing a stored value, a browser storage or cookie key, or a figure shown in more than one place, read [`docs/system/README.md`](../system/README.md).

- **One source of truth per fact.** Every stored fact about a user has one entry in `docs/system/value-map.yaml`, naming the one table and column that holds it. Do not add a second store for a fact that already has a home: read it from its home. A copy is allowed only when the map lists it with its status (`cache`, `derived` and so on) and says what keeps it equal.
- **One engine function per shared figure.** A figure shown in more than one place is computed by one function in `packages/finance-engine/src`, named in its map entry. Pages, backend services and AI tools read the figure from there. They do not sum balances, apply shares or convert amounts themselves.
- **Update the map in the same PR.** A PR that adds, moves or removes a database column, a profile field, a browser storage or cookie key, or a shared figure updates the map in the same PR. A new column also goes in its table's `valueMap` in `apps/backend/src/modules/privacy/user-data-registry.ts`. Then run `bun scripts/generate-value-map.ts`.
- **Guard.** `bun scripts/check-value-map.ts` (part of `check:laws`) fails on a column or browser key with no entry, a path, function, table or column that no longer exists, a malformed entry, a fact with no source of truth, a figure outside the engine, and stale generated views. Known problems are in `scripts/value-map-baseline.json`, each tied to an audit finding. The baseline only shrinks; raising it falls under section 15. Arithmetic that may be a second formula prints as a warning and does not fail the run.

### Functionality map (route level)

> **Detailed Reference**: Before adding or removing a route, or changing which facts or figures a page section reads, read [`docs/system/functionality-map/README.md`](../system/functionality-map/README.md).

- **Update the functionality map in the same PR.** A PR that adds or removes a route, or changes which facts or figures a section reads, updates `docs/system/functionality-map/pages/{web|marketing}/<page-id>.yaml` (or `excluded_routes` in `docs/system/functionality-map/index.yaml` for non-UI routes) and runs `bun run functionality-map`. The map stops at section level: no per-control entries (buttons, links, inputs, labels).
- **Guard.** `bun scripts/check-functionality-map.ts` (part of `check:laws`) fails on invalid schema, duplicate IDs, dead file paths, unknown `value-map.yaml` fact or figure IDs, stale generated views (`overview.md`, `by-fact.md`) or unmapped routes.

## 17. TESTS THAT CATCH FAULTS AND RUN FAST LAW

> **Detailed Reference**: Before adding or changing any test, read [`docs/testing/writing-tests.md`](../testing/writing-tests.md).

- **A test must fail when the code is wrong.** Every test asserts a specific value, output, state or call; `toBeDefined`, `toBeTruthy`, `not.toThrow` or a snapshot is never the only assertion on a behaviour. Each comparison is tested on its edge, just below and just above. Each branch is taken both ways. Inputs are chosen so a wrong operator, a swapped argument or a missing default gives a different answer.
- **See it fail.** Before trusting a new or changed test, break the code it covers and watch the test fail. A bug-fix test fails before the fix. For a change to logic in `packages/finance-engine`, or in `apps/backend` guards, interceptors, auth or `security/`, run Stryker on the changed files (the command is in the guide) and kill each survivor or give it a row in `docs/testing/mutation-triage.md`.
- **Never weaken a test to make it pass.** Loosening an assertion or deleting a case needs the reason in the PR description. `.only` and a bare `.skip` are never committed; `skipIf` on a stated condition is allowed.
- **A test must be quick.** In `apps/web`, `packages/ui` and `apps/marketing`, a test file with no DOM in the test or its source starts with `// @vitest-environment node` (conditions in the guide). No real waiting (fake timers, never a longer timeout), no real network, database or clock in a unit test, no `Math.random` or wall-clock assertions. Import and render only what the test needs. A new or changed unit test file that takes more than 5 seconds on its own needs the reason in the PR description.
- **Mutation testing stays local.** No workflow runs Stryker (owner decision, 20 November 2026). `bun run mutation <package|all>` is the whole-package check, run about once a month; the floors in `scripts/mutation-baseline.json` fall under section 15.
- **The PR description has a "Tests" heading** saying which behaviours the tests cover, how each test was seen to fail, and any test weakened, skipped or removed.
