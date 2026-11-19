# E41. Mutation testing and faster tests

Decisions: accepted on 19 November 2026

> Status: plan accepted by the owner on 19 November 2026. No code yet. Written 2026-11-19 against `origin/main` at `6c2022fc`. Paths are relative to the repository root. Figures are marked "measured" or "estimate".

## 1. Summary and why it matters

- **Mutation testing** makes one small deliberate fault at a time in the code (a `+` becomes a `-`, a `>` becomes `>=`) and runs the tests. If no test fails, the fault "survived": the tests would not notice that mistake. Stryker is the tool. Line coverage says a line ran; mutation testing says a test would catch it being wrong.
- It is slow, so it is staged by value. First the code where a surviving fault means a wrong money figure, then the contract and the AI tools, then authorisation and validation, then web and UI logic.
- Results become tests. Each survivor is triaged; real gaps get a test with a hand-worked expected value (AGENTS.md section 14).
- A per-package score floor works like the existing baselines: it can rise freely and is lowered only with sign-off (section 15).
- Test speed is a separate workstream. It starts by measuring, and every fix shows a before and after figure. No fix drops an assertion or skips a test.
- No outside service. Reports are HTML files kept as CI artifacts.

## 2. What exists today (measured)

Runner and layout:

| Suite | Runner, environment | Test files on main | Tests (CI run 44514206119, a pull request branch) | Run time in that run |
| --- | --- | --- | --- | --- |
| `packages/finance-engine` | Vitest, node | 71 | 1,655 in 77 files (matched by size; see Not verified) | 46 s |
| `packages/mcp` | Vitest, node | 22 | 638 | 47 s |
| `packages/api-contract` | Vitest, node | 13 | 204 | 11 s |
| `packages/banking` | Vitest, node | 7 | 103 | under 1 s |
| `packages/observability` | Vitest, node | 6 | 254 | 5 s |
| `packages/api-client`, `format`, `tokens`, `business-details` | Vitest, node | 3, 4, 4, 1 | not matched to a package | a few seconds each |
| `packages/ui` | Vitest, happy-dom | 122 (94 stories) | 1,350 passed, 1 skipped | 105 s |
| `apps/marketing` | Vitest, happy-dom | 36 (19 stories) | 411 | 71 s |
| `apps/web` unit project | Vitest, happy-dom | 327 | 3,583 passed, 14 skipped | 155 s |
| `apps/web` Storybook project | Vitest browser mode, headless Chromium | 245 story files | 1,043, run twice (light, dark) | 94 s and 147 s |
| `apps/backend` | Vitest, node, one file at a time | 140 (23 use the real-Postgres switch) | 2,008 with the database | 281 s |
| `apps/e2e` smoke | Playwright, 2 workers in CI | 21 spec files | 90 | 1.3 min |
| `apps/e2e` visual, a11y, interaction, sweep | Playwright | 1, 1, 2, 2 spec files | not read | not read |
| `scripts/` law checks | `bun test` | 45 | not read | inside the Lint job |

- All Vitest packages are on Vitest 5.1.0 and TypeScript 7.0.2 (root `package.json`).
- Web has two Vitest projects in `apps/web/vite.config.mts` (the `projects` block): `unit` and `storybook`.
- Backend database specs use `describe.skipIf(resolveDbTestMode(process.env) === "skip")`. They skip without `TEST_DATABASE_URL` and fail collection in CI, where `REQUIRE_DB_TESTS=1` is set. Files run one at a time because the database suites reset one shared schema (`apps/backend/vitest.config.ts:11-13`).
- Coverage floors already act as a ratchet: "Floors = floor(measured) - 1 (owner decision D6-a)" in each `vitest.config.ts`.
- Baseline files for the law checks live in `scripts/*-baseline.json`, as per-file counts.

CI (`.github/workflows/ci-pipeline.yml`, required checks in `.github/required-checks.json`):

| Job | Measured over four runs on 2026-11-19 | Note |
| --- | --- | --- |
| Lint and type check | 46 to 59 s | includes `check:laws` and `bun test ./scripts` |
| Vitest web | 40 to 243 s | 40 s is a full Turbo cache hit |
| Vitest backend and packages | 37 to 316 s | backend alone is 281 s when not cached |
| Storybook a11y (light) | 182 to 465 s | |
| Storybook a11y (dark) | 260 to 517 s | usually the slowest required job |
| E2E smoke | 127 to 241 s | test step itself 79 to 87 s |
| Build, Ops scripts, Docker images, Audit | 30 to 142 s | |
| Whole pull request run | 2 min 25 s to 8 min 40 s over six runs | |

Three findings from those logs:

1. **Installing the browser costs more than the tests.** The "Install Chromium" step took 9, 10, 92, 112, 249 and 328 seconds in six job runs. It runs `playwright install-deps` even when the browser cache hits. The Storybook tests after it took 98 to 152 seconds.
2. **Backend time is test time.** 76% of 281 seconds is tests running, one file at a time. In the web unit run only 22% is tests; 36% is importing modules, 21% is building the happy-dom environment, 9% is setup files. In `packages/ui`, 36% is environment.
3. **Turbo's cache works.** 18 of 23 tasks and 12 of 13 tasks were cache hits in one run. The cache is `felixmosh/turborepo-gh-artifacts` in `.github/actions/bun-setup/action.yml`.

## 3. StrykerJS facts

Checked on 2026-11-19 from the npm registry and Stryker's own documentation:

| Fact | Source | Effect on the plan |
| --- | --- | --- |
| Current version 10.1.1; needs Node 22 or later | npm | CI has no `setup-node` step today; M0 checks the runner's Node version |
| Vitest runner accepts `vitest >=2.0.0` | npm peer range | The range allows Vitest 5.1.0. Whether it works is **to verify in M0** |
| Vitest browser mode is not supported | Vitest runner docs, "Limitations" | The Storybook project cannot be mutation-tested |
| Coverage analysis is always per test; Stryker runs one Vitest worker per process and uses its own parallel workers | same | Only the tests that touch a fault are run for it |
| Runs only tests related to the changed file by default (`vitest.related`) | same | Must be checked for backend specs that reach code over HTTP |
| Incremental mode reuses results from a saved JSON file | incremental docs | Basis for the pull request run |
| `mutate` takes file globs; there is no `--since` flag in the configuration reference | configuration docs | The pull request job builds the file list from `git diff` |
| `thresholds.break` fails a run below a score | configuration docs | Not used; our own baseline check does this |
| Faults can be ignored by a `// Stryker disable` comment, by switching off a mutator, or by a plugin | disable-mutants docs | See decision 2 |
| `inPlace` mode and a `dashboard` reporter exist | configuration docs | See M0 and decision 6 |
| TypeScript checker plugin accepts `typescript >=3.6` | npm peer range | Whether it works with TypeScript 7 is **to verify in M0** |

To verify in M0: Vitest 5 support in practice; whether the runner can pick one Vitest project (web `unit`) or needs its own config file; whether Stryker's sandbox copy works in a Bun workspace with built packages and Panda's generated `styled-system`, or `inPlace` is needed; `fast-check` property tests under per-test coverage (6 engine files use it); the size of the incremental file.

## 4. What gets mutation-tested, and what does not

"Across all our tests", answered plainly:

| Code | Mutation-tested? | Why, and what is done instead |
| --- | --- | --- |
| `packages/finance-engine/src` | Yes, first | A survivor here can be a wrong money figure |
| `packages/api-contract`, `packages/mcp` | Yes, second | Validation of what is saved, and what the AI tools report |
| `packages/format`, `banking`, `api-client`, `business-details`, `observability` | Yes, with the second group | Small and quick |
| Backend guards, interceptors, security and module services | Yes, third | `auth/auth.guard.ts`, `modules/agent/mcp-pat.guard.ts`, `modules/imports/imports-access.guard.ts`, `security/`, `contract/`, `modules/*` services, judged by unit specs and `test/authz` |
| `apps/web/app/utils`, `hooks`, `services`, `state`, `server/`, then `containers` | Yes, fourth | Logic only |
| `packages/ui` component logic and helpers | Yes, last | Logic only |
| Panda style recipes (`*.styles.ts`, 268 files) | No | A changed token is a visual change. Covered by `check:laws` and the visual suite |
| Stories and the Storybook a11y project | No | Browser mode is not supported. They stay gated by the two required a11y jobs |
| Playwright smoke, visual, a11y, interaction, sweep | No | One fault would need a full browser run: hours per file. Faults in web logic are judged by unit tests instead. The E38 harness is untouched |
| Migrations (53 files) and entities | No | A changed migration is not a meaningful fault. Covered by the real-Postgres migration specs |
| Generated code (`styled-system`, `native.generated.ts`, `openapi.json`) | No | Not written by hand |
| Snapshot assertions (5 in `mcp`, 6 in web) | Counted as they are | A snapshot kills faults without a hand-worked value. Triage notes where a snapshot is the only killer |
| `scripts/` law checks (`bun test`) | Not in this epic | Stryker has no Bun test runner. Its command runner would work but re-runs every test for every fault. Left as a possible later slice |
| Copy strings | Decision 7 | Covered by `check-copy`; string faults are mostly noise in UI code |

Exclusions are written as `mutate` globs in each package's Stryker config, so they are visible in one file per package and reviewed like any other config.

## 5. From results to better tests

Triage, one line per survivor in the report:

| Class | Meaning | Action |
| --- | --- | --- |
| Real gap | A plausible mistake no test catches | Write a test that fails on the fault |
| Equivalent | The changed code behaves the same for every input | Record it with a one-line proof (decision 2). No test |
| Not worth killing | Behaviour nobody relies on: log text, an unreachable guard | Record it with a reason. The reviewer checks the reason |
| No coverage | No test runs the line at all | Treat as a real gap, or delete dead code |

Rules for the tests:

- Section 14 applies in full. The expected value is worked out by hand with the working in a comment, as in E39's worked cases. It is never copied from the function's output or from the Stryker report.
- A test is written for the behaviour, not for the fault. "Kills mutant 412" is not a test name.
- No test is weakened or deleted to raise a score.
- Tests that assert a tax figure follow the vector sign-off route (decision 8).
- The independent reviewer (section 12) checks a sample of new tests against their hand working.

The ratchet (decision 3): `scripts/mutation-baseline.json` holds one score floor per package, set at floor(measured) - 1 as the coverage floors are. `scripts/check-mutation-score.ts` compares the latest full report with the floor. Raising a floor needs no sign-off. Lowering one is a guard change under section 15 and is listed under "Guard changes" in the PR.

Recording equivalents (decision 2, recommended form): a triage ledger, `docs/testing/mutation-triage.md`, one row per recorded survivor (file, the fault, class, reason, date). The ledger does not change the score and Stryker never reads it. Recorded survivors stay in the count, and the floor sits below 100 to allow for them. Nothing is suppressed, so the rule against scanner suppressions and allow-lists is not touched. The cost: the score never reaches 100.

## 6. Where it runs

| Run | When | Blocking? | Output |
| --- | --- | --- | --- |
| Full run per package | Weekly, staggered, plus manual start (decision 5) | Fails its own scheduled job when a score is under its floor. Not a merge gate | HTML and JSON report as a CI artifact; score table in the job summary; the incremental file saved to the Actions cache |
| Changed files in a pull request | On pull requests that touch a covered package | Advisory, like the visual and a11y jobs (decision 4) | Survivors in changed files, in the job summary |
| Local | By hand, one file or folder | No | HTML report in an ignored folder |

The advisory job copies the pattern in `.github/workflows/visual-regression.yml` (own workflow file, `continue-on-error`, not listed in `.github/required-checks.json`).

CI time, all estimates until M1 measures them:

- Full run: finance-engine 30 to 90 minutes; MCP 20 to 60; api-contract and small packages 10 to 20; backend 1 to 3 hours; web logic 1 to 3 hours; UI logic 30 to 90 minutes. Roughly 4 to 10 runner-hours a week once every stage is in.
- Pull request run: the package's own test run once (46 seconds for the engine, measured) plus the changed faults. Estimate 2 to 10 minutes for an engine change.
- The repository is public, so standard GitHub runners are not billed by the minute (to confirm on the billing page). The real cost is queue time. Scheduled runs go at night.

## 7. Slices: mutation testing

Each slice is one PR, not stacked, reviewed by a different agent before merge. Lane sessions and review subagents are started with an explicit model: `opus` for code, tests, triage and review; `sonnet` for mechanical baseline updates (AGENTS.md section 6). Lanes do not edit `AGENTS.md`.

**M0. Proof on one module (S).** No decisions needed.
- Add `@stryker-mutator/core` and `@stryker-mutator/vitest-runner` as root dev dependencies at one version (section 9); `packages/finance-engine/stryker.config.json`; a root `mutation` script outside `turbo run test`; the report folder in `.gitignore`.
- Run against `packages/finance-engine/src/mortgage.ts` only. Record time, fault count and survivors.
- Answer every "to verify in M0" item in section 3 in `docs/testing/mutation-testing.md`.
- If Vitest 5 is not supported, stop and report. Do not pin Vitest back.

**M1. Scheduled run and ratchet (M).** Needs decisions 2, 3, 4, 5, 6.
- `.github/workflows/mutation.yml`: weekly matrix per package, manual start, artifact upload, job summary. Pull request job on changed files, advisory.
- `scripts/check-mutation-score.ts`, `scripts/lib/mutation-score.ts`, a `bun test` file, `scripts/mutation-baseline.json` with the engine's first measured floor.
- Tests: the script's own unit tests with fixture reports; `scripts/ci-config.test.ts` still passes with job names unchanged.
- Guard changes: a new baseline file (listed in the PR). No required check is added.

**M2. Engine kill tests (L).** Needs decision 8 for tax files. May be two PRs by area if large: tax and pay (`uk-*`), then mortgage, debt, pension, picture selectors.
- Triage every engine survivor. Write tests under section 14. Fill the ledger. Raise the floor.

**M3. Contract, MCP and small packages (M).** Config per package, first full run, triage, tests, floors.

**M4. Backend guards and services (L).** Needs decision 11.
- `apps/backend/stryker.config.json` with `mutate` limited to guards, interceptors, `security/`, `contract/` and module services. Excludes `migrations/`, `entities/`, `main.ts`, `instrument.ts`, `scripts/`, `testing/`.
- First run without the database specs. Report how many survivors sit in code only the database specs reach.
- Authorisation survivors are top priority: a guard that still passes with its check removed.

**M5. Web and UI logic (L).** Starts after the E40 slices that rewrite containers and forms have merged.
- Web: `utils` (26 files), `hooks` (9), `services` (8), `state`, `server/`, then `containers` (14). The runner must use the `unit` project only.
- UI: helpers and component logic. Style files and stories excluded.
- New or changed components follow sections 1 and 4. Test-only changes do not need new stories.

**M6. Close-out (S).** Needs decisions 4 and 12.
- Final floors, the how-to in `docs/testing/mutation-testing.md`, a review of four weeks of advisory results, and the coordinator's `AGENTS.md` edit if decision 12 says so.

Verification for every slice: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run check:laws`, tests for the changed packages only; CI runs the rest. The PR report says which tests were skipped locally (database specs without `TEST_DATABASE_URL`).

## 8. Slices: test speed

Rule for every fix: a before and after figure from the same kind of run, three runs each, in the PR description. No assertion dropped, no test skipped, no timeout raised to hide a slow test. Less isolation needs proof that tests do not leak state (decision 10).

**P0. Baseline (S).** No decisions needed.
- `docs/testing/test-speed-baseline.md`: per-package wall time in CI and on one named local machine; the slowest 20 files per package (Vitest JSON reporter); the import, environment, setup and test split; job and step durations over the last 20 runs (`gh run view --json jobs`); Turbo cache hits per job; Playwright durations per project.
- A small script, `scripts/test-timings.ts`, so the figures can be re-taken.
- Section 2 of this plan is the starting data.

Candidate fixes, ranked by expected gain and risk. Gains are estimates until P0.

| Rank | Fix | Evidence today | Expected gain | Risk | Slice |
| --- | --- | --- | --- | --- | --- |
| 1 | Stop reinstalling browser system packages when the cache hits | Step took 9 to 328 s; it sets the slowest job | Minutes off the slowest pull request job, and far less variation | Low. Check Chromium still starts | P1 |
| 2 | Backend: run non-database files in parallel, keep the 23 database files serial | 281 s, 76% in tests, `fileParallelism: false` | Large | Medium. Specs that share ports, `process.env` or module state | P2 |
| 3 | Web and UI: node environment for tests that use no DOM | Environment is 21% (web) and 36% (UI). 143 web `.test.ts` files, 33 already node, about 14 use DOM calls by a rough search | Medium | Low. A wrong pick fails loudly | P3 |
| 4 | Web setup files: the global `react-router` mock loads the real module in every file (`apps/web/test/vitest.setup.ts:23`); `logHeapUsage` is on | Setup 9%, import 36% | Medium | Medium. Many tests lean on the mock | P3 |
| 5 | Barrel imports: tests that pull all of `@repo/ui` or a feature index | Import is the largest share in web | Medium | Low to medium | P3 or P4 |
| 6 | Slowest 20 files: real timers and waits, repeated renders of large containers | 14 test files use `setTimeout`, `sleep` or `delay`; 13 container tests | Medium, file by file | Low if assertions are unchanged | P4 |
| 7 | Vitest pool and isolation for pure packages (engine, contract, format) | Engine: 46 s for 1,655 tests, 28% import | Small to medium | Medium to high. Shared state between files | P4 |
| 8 | Turbo: `test` depends on `^test` (`turbo.json`, the `test` task), so a filtered local run also runs dependencies' tests; `test` has no `inputs`, so any file change misses the cache | Config read | Faster local pre-flight; more cache hits | Medium. Inputs that are too narrow give a false cache hit, which is a silently skipped test | P5 |
| 9 | Shard the web unit run across two jobs | 155 to 214 s test step | Medium | Medium. Coverage floors must be checked on merged results | P5 |
| 10 | Playwright workers | 2 workers; 90 tests in 1.3 min; the test step is not the bottleneck | Small | Medium. See below | P5 |
| 11 | Database specs: a schema per file so they can run together | Part of the 281 s; share not yet measured | Unknown | High | Only if P0 shows it is still on top after P2 |
| 12 | Storybook project: both themes run all 245 files | 94 to 150 s per theme | Small | Changing what runs is a guard change | Not proposed |

On Playwright workers: the backend allows 300 requests a minute per address (`apps/backend/src/security/rate-limit.decorator.ts:34`). The harness gives each project its own address (`apps/e2e/support/client-address.ts:12-16`), but all workers in one project share it. More workers means more requests from one address and a risk of 429 responses. If workers are raised, give each worker its own documentation-range address. The backend limit is not changed: that would be a security guard change.

**P1. Browser install in CI (S).** Decision 13. Edits the install step in `ci-pipeline.yml` (Storybook and E2E jobs) and in `visual-regression.yml`, `a11y-gate.yml`, `interaction-cost.yml`. Job names stay the same.

**P2. Backend in parallel (M).** Decision 10. Two Vitest projects in `apps/backend/vitest.config.ts`: `unit` in parallel, `db` serial. Proof: five shuffled parallel runs of `unit` with no failure, and a search for specs that bind ports or set `process.env`. Coverage floors unchanged and checked on the combined result.

**P3. Web and UI environment and setup (M).** Per-file `// @vitest-environment node` headers or a node project; narrow the global mocks. Lands in a quiet window, announced to open lanes, because it changes the shared setup file.

**P4. Slow files and isolation (M).** The slowest 20 files from P0, then isolation for pure packages only if decision 10 allows.

**P5. Turbo and CI shape (S to M).** Decisions 9 and 10.

## 9. Risks and trade-offs

- **Stryker may not run on Vitest 5 or TypeScript 7.** M0 is small so this is found in a day. The epic's mutation half stops there if so.
- **Score chasing.** A floor invites tests written to please the tool. The triage classes, the section 14 rule and the reviewer's sample are the defence.
- **A scheduled job that fails after merge is easy to ignore.** The coordinator owns it and opens a lane when it is red.
- **Time.** Triage of thousands of survivors is real work. The stop-check in decision 1 limits it.
- **Speed fixes can hide leaks.** Hence the shuffled-run proof and decision 10.
- **New dev dependencies** in a public repo. They run in development and CI only and are covered by the dependency audit job.
- **No secrets are needed** for anything recommended here.

## 10. What the owner will notice

- Nothing changes in the app.
- Pull requests gain one advisory check, "Mutation testing (changed files)", with a short list of faults no test caught.
- A weekly report per package, as a downloadable file on the workflow run.
- Pull request checks finish sooner and vary less once P1 and P2 land.
- PR descriptions for speed work carry a before and after table.

## 11. Overlap with other work

| Work in flight | Effect |
| --- | --- |
| E40 slice 3 (PR 786: engine, MCP, backend, web) | M2 tests for `packages/finance-engine/src/picture` wait until it merges. Tax, mortgage, debt and pension modules can start |
| E40 slices 4 to 9 (account forms, onboarding, containers, migrations, browser state) | M5 container and form work waits for each slice. M4 skips services a slice is rewriting. Migrations are never mutated. A survivor in a file an open slice is rewriting is logged in the ledger as "waiting for slice N" and tested after that slice merges |
| E38 interaction-cost harness (`apps/e2e/interaction`, `interaction-cost.yml`) | Not mutation-tested and its counts are not touched. P1 edits only the browser install step in its workflow; agree the timing with that lane |
| E39 S1 (adds to `mortgage.ts`) | New engine code arrives with hand-worked tests; the pull request mutation report covers it |
| Visual baselines | No slice regenerates them. If one ever must, it is done in CI by the workflow's manual update, never locally |

Can run now with no collision: M0, M1, P0, P1, P2, P5 (config, scripts and workflows only). M2 (outside `picture`) and M3 can run now. P3 needs a quiet window. M4 and M5 wait as above.

## 12. Owner decisions

All thirteen were accepted on 19 November 2026 with the recommended option. Shown the plan and asked whether they accept the recommended option on all thirteen, the owner answered: "Accept all 13". The record is in [DECISIONS.md](./DECISIONS.md), round 12. Decision 8 means tests that assert a tax figure still need the owner's tax vector sign-off, which is separate and has not been given.

Each has options and a recommendation. A flag says when it names an outside service, touches security or a guard, or changes where user data is stored. No decision changes where user data is stored.

1. **How far to go.**
   - A. Engine only.
   - B. Engine, contract, MCP, small packages, backend guards and services.
   - C. B plus web and UI logic.
   - Recommendation: C in stages, with a stop-check after M4 using the measured cost of M2 to M4.
   - **Accepted on 19 November 2026: option C, in stages, with a stop-check after M4**.

2. **How equivalent and not-worth-killing survivors are recorded.** Flag: guard design (section 15).
   - A. `// Stryker disable` comments in the source, each with a reason.
   - B. A ledger in `docs/testing/mutation-triage.md` that the tool never reads. Survivors stay in the count; the floor allows for them.
   - C. An ignore list in the Stryker config.
   - Recommendation: B. A and C are suppressions by another name and would each need owner sign-off.
   - **Accepted on 19 November 2026: option B**.

3. **Form of the ratchet.** Flag: guard design.
   - A. One score floor per package, floor(measured) - 1, as the coverage floors are.
   - B. Survivor counts per file, like the law baselines.
   - C. Report only, no floor.
   - Recommendation: A. Move to B for the engine later if the floor proves too coarse.
   - **Accepted on 19 November 2026: option A**.

4. **Is the pull request check ever blocking?** Flag: changes a required check (section 15).
   - A. Never. Advisory for good.
   - B. Advisory now. After four weeks of results, decide whether it blocks for `packages/finance-engine` only.
   - C. Blocking from the start.
   - Recommendation: B. It adds minutes to every engine PR, so decide with data.
   - **Accepted on 19 November 2026: option B**.

5. **How often the full run happens.**
   - A. Weekly per package, staggered at night, plus manual start.
   - B. Nightly.
   - C. Manual only.
   - Recommendation: A.
   - **Accepted on 19 November 2026: option A**.

6. **Hosted Stryker dashboard.** Flag: outside service; needs a secret token; the repo is public, so reports would be public on a third-party site.
   - A. No. HTML reports as CI artifacts only.
   - B. Yes, with a badge.
   - Recommendation: A.
   - **Accepted on 19 November 2026: option A**.

7. **String faults.** Flag: guard design (narrows what is checked).
   - A. All fault types on everywhere.
   - B. String faults off in `apps/web` and `packages/ui` only, where strings are mostly copy already covered by `check-copy`.
   - C. Off everywhere.
   - Recommendation: B, and report the number left out.
   - **Accepted on 19 November 2026: option B**.

8. **Tests that assert a tax figure.** Flag: financial correctness.
   - A. They go through the existing vector sign-off (`bun run tax:signoff`, E4).
   - B. Ordinary tests, no sign-off.
   - Recommendation: A. Until sign-off is given, tax survivors are logged, not tested.
   - **Accepted on 19 November 2026: option A**.

9. **Speed target.**
   - A. No number. Keep each fix that shows a gain.
   - B. Two numbers set by the owner after P0: the time for a typical pull request's required checks, and the time for a local web test run.
   - Recommendation: B. For reference, pull request runs took 2 to 9 minutes today; 5 minutes is a suggestion, not a measured promise.
   - **Accepted on 19 November 2026: option B (the owner sets the two numbers after P0)**.
   - **Targets set on 19 November 2026.** Asked "Accept the two proposed test speed targets?", the owner answered "Yes, accept both". (1) A pull request's required checks: typical 3 min 30 s, worst 6 min (the slowest required job in a run, median and maximum). (2) A local web unit run (`apps/web`, `vitest run --project unit`): 2 min on a quiet machine. They are targets to report against, not CI gates; a failing check for them needs the coordinator first.

10. **May a fix reduce test isolation?** Flag: guard design (could hide a leaking test).
    - A. Never.
    - B. Per package, with five clean shuffled runs as proof and coordinator sign-off.
    - Recommendation: B, for the backend unit files (P2) and pure packages only.
    - **Accepted on 19 November 2026: option B**.

11. **Backend database specs in mutation runs.**
    - A. Left out at first; report what they alone cover.
    - B. Included in the scheduled run.
    - Recommendation: A, then decide from M4's figures.
    - **Accepted on 19 November 2026: option A**.

12. **A new law.** Flag: `AGENTS.md` edit, made by the coordinator, not a lane.
    - A. None. The how-to document is enough.
    - B. After M6, the coordinator adds a short section: the mutation floors are a ratchet, and the triage ledger is the only place survivors are recorded.
    - Recommendation: B.
    - **Accepted on 19 November 2026: option B**.

13. **How CI gets its browser (P1).** Flag for C: a new outside image source.
    - A. Keep the cached browser; skip the system package step when the runner already has what Chromium needs.
    - B. Cache the system packages as well.
    - C. Run the jobs in the official Playwright container image.
    - Recommendation: A if P1 shows Chromium starts without the step; otherwise B.
    - **Accepted on 19 November 2026: option A if P1 shows Chromium starts without the step, otherwise B**.

## 13. The strongest argument against

The engine already has about 1,650 tests with hand-worked values, coverage floors on every package, and an owner sign-off for tax vectors. Mutation testing will mostly confirm that, and the survivors it finds will include many that do not matter. Triage is slow, and a score invites tests written for the tool. The honest case is narrower: boundary conditions in money and tax code (`>` against `>=` at a threshold) and authorisation checks are exactly where coverage figures mislead, and a few caught there justify the first three stages. Web and UI logic may not repay the effort, which is why decision 1 has a stop-check. The speed work stands on its own: the measured browser install and backend figures are worth fixing whatever is decided about mutation testing.

## Not verified

See the list at the end of the planning report; copy it here when the file is written.
```

---

# Not verified

- **Stryker on Vitest 5.1.0.** The peer range (`>=2.0.0`) allows it. I did not run it.
- **Stryker's TypeScript checker on TypeScript 7.0.2.** The peer range (`>=3.6`) allows it. Not run.
- **Stryker with Vitest projects.** The runner docs I read say nothing about picking one project, so web may need its own config file.
- **Stryker's sandbox in this Bun workspace.** Built packages, Panda `styled-system`, and web config imports from `../../scripts` and `../marketing` may force `inPlace`.
- **`mutate` line ranges.** I confirmed file globs, and that the configuration headings have no `--since`. I did not read the line-range text.
- **Node version on `ubuntu-latest`.** Stryker needs 22 or later, and no workflow has a `setup-node` step.
- **The finance-engine row in the test table.** It is matched by size: 77 files and 1,655 tests in a pull request run, against 71 files on main. The 3-file and 4-file package results were not matched to packages.
- **All test counts and durations.** They come from one pull request run (44514206119), with coverage on, not from main. Job ranges come from four runs and whole-run times from six, all on 2026-11-19.
- **Local timings.** None taken; I ran no suite.
- **All mutation run times and weekly runner-hours.** Estimates with no measurement behind them.
- **Billing.** That standard runners are free for this public repo is not checked against the billing page.
- **The browser install fix.** Whether Chromium starts on the runner without `install-deps` is P1's first question.
- **The "about 14 web `.test.ts` files use DOM calls" figure.** A rough text search, not an analysis.
- **Coverage across two backend Vitest projects.** Whether the floors still apply to the combined result is unchecked.
- **`environmentMatchGlobs` or an equivalent in Vitest 5.** Not checked.
- **`check-tax-signoff` and new tax test values.** I did not read how it counts them, so decision 8 rests on the law text, not the script.
- **`scripts/ci-config.test.ts` and a new advisory workflow.** I saw it checks advisory jobs but did not read the whole test.
- **E40 slices 4 to 9 being in flight.** Taken from your brief. The open PRs I saw were 786 (slice 3), 789 and the release PR.
- **Playwright suites other than smoke.** Test counts and durations for visual, a11y, interaction and sweep were not read.
- **Line numbers in `ci-pipeline.yml`, `vite.config.mts`, `turbo.json` and `playwright.config.ts`.** Left out or approximate, because I read those files with comments stripped.
