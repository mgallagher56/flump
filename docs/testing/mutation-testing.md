# Mutation testing

Mutation testing makes one small fault at a time in the code (a `>` becomes `>=`, a `-` becomes `+`) and runs the tests. If no test fails, the fault "survived": the tests would not notice that mistake. The tool is [StrykerJS](https://stryker-mutator.io/). The plan is [E41](../audit/plans/E41-mutation-testing-and-test-speed-plan.md).

Status: slice M2 done. The whole of `packages/finance-engine` is mutation-tested once a week in CI, and its score is checked against a floor. Pull requests that change engine source get an advisory list of faults no test caught. M2 added kill tests for every engine file (part A outside tax and pay, part B tax and pay) and recorded every fault left over in the [triage ledger](./mutation-triage.md). Other packages come in M3 to M5.

## Run it locally

```bash
bun run mutation --mutate "src/mortgage.ts"
```

This runs Stryker in `packages/finance-engine` with [`stryker.config.json`](../../packages/finance-engine/stryker.config.json). The config mutates the whole package: every `src/**/*.ts` file except tests, `__fixtures__`, `test-vectors` and `index.ts` barrels (69 files, 11,577 faults). A whole-package run took 56 minutes on a busy laptop, so pass `--mutate` for the file or folder you are working on.

- Reports: `packages/finance-engine/reports/mutation/mutation.html` (open it in a browser) and `mutation.json`. The folder is git-ignored.
- The run reuses earlier results from `reports/mutation/stryker-incremental.json`. Add `--force` for a full run.
- `--mutate` also takes a line range: `--mutate "src/mortgage.ts:32-44"`.
- The config uses `inPlace` (see below). Stryker writes the faults into the real source files, and adds `// @ts-nocheck` to every file in the package, test files included. It puts the originals back at the end, from a backup in `packages/finance-engine/.stryker-tmp/`. Do not edit or commit engine files while a run is going.
- To stop a run, press Ctrl+C or send it SIGINT. In M1 this put every file back and saved a partial incremental file. It leaves `stryker-setup-*.js` files in the package folder, which are git-ignored and safe to delete. The main process renames itself `stryker`, so `pkill -f "stryker.js run"` does not find it.
- The script is not part of `turbo run test`. CI runs Stryker from its own workflow (next section).

## The weekly run and the ratchet

[`.github/workflows/mutation.yml`](../../.github/workflows/mutation.yml), its own workflow file, not a required check (E41 decisions 3 to 6).

| Job           | When                                                                   | What it does                                                                                                                                                                                       | Blocks a merge?               |
| ------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Pick packages | Weekly run and manual start                                            | Chooses the packages: by cron for the weekly run, or the `package` input (a folder, or `all`) for a manual start                                                                                   | No                            |
| Shards 1 to 8 | After it                                                               | Each mutates about an eighth of the package's files, by size, and uploads its HTML and JSON report. Each shard saves its own incremental file to the Actions cache                                 | No                            |
| Score         | After all shards                                                       | Joins the eight JSON reports and runs the ratchet. Fails when a shard report is missing or the score is under the floor. Writes the score and the files with the most survivors to the job summary | No. It fails only its own job |
| Changed files | Pull requests that touch engine source or its Stryker or Vitest config | Mutates the changed source files only and lists every survivor in the job summary. Advisory (decision 4)                                                                                           | No                            |

- Schedule: Sunday at 02:17 UTC for the engine. The weekly run always reruns every fault (`--force`). Stryker's incremental mode reuses a fault's result when its own file and the test files are unchanged, but it does not see a change to another source file that a test imports, so reused results could go stale. A manual start (Actions, "🧬 Mutation testing", Run workflow) reuses the latest saved results unless `force` is ticked. It then runs in a few minutes: the M1 rerun took under a minute per shard.
- Node 24 from `actions/setup-node`, because Stryker 10 needs 22 or later. Bun runs the scripts.
- Reports are artifacts named `mutation-report-finance-engine-shard1` to `shard8`, kept for 30 days. There is no hosted dashboard (decision 6).
- Why shards: they run side by side, so the run finishes in about 20 minutes instead of over an hour. That leaves room as M3 to M5 add packages. Each shard runs only the tests Vitest finds related to its own files. The M1 comparison below found the same results as an unsharded run, apart from tests that time themselves.
- Files are split by size, so a file can move to another shard when files change. Its results then start again in the new shard. Stryker also keeps the moved file's old results in the old shard's report, carried over from that shard's incremental file, so the score job keeps from each report only the files that shard was given this run. Without that, the second CI run on the branch failed with `src/picture/figure.ts is in more than one shard report`.
- The pull request job compares GitHub's merge commit with its first parent, so changes that reached `main` after the pull request opened are not mutated as its own. It does not use the weekly incremental files. Each shard's file covers only that shard's files, and Stryker numbers tests from 0 in every run, so the files cannot be joined. Mutating only the changed files keeps the job short: M0 measured 22 to 70 seconds for all of `mortgage.ts`.

The ratchet, [`scripts/check-mutation-score.ts`](../../scripts/check-mutation-score.ts):

- The score is Stryker's own: faults caught (killed or timed out) over faults caught, survived or with no coverage. Compile and runtime errors are left out, as Stryker leaves them out.
- [`scripts/mutation-baseline.json`](../../scripts/mutation-baseline.json) holds one floor per package, set at floor(measured) - 1 (decision 3). The check fails under the floor, and also when a package has no floor.
- When the score allows a higher floor, the job summary says so. Raising a floor needs no sign-off. Lowering one is a guard change (AGENTS.md section 15) and is listed under "Guard changes" in the PR.
- Survivors recorded as equivalent or not worth killing (decision 2, the triage ledger M2 adds) stay in the count. The floor sits below 100 to allow for them. Nothing is suppressed.
- A red weekly run is the coordinator's to pick up (plan section 9). Open the score job's summary, then the shard reports.
- Run the check by hand on any report: `bun scripts/check-mutation-score.ts check packages/finance-engine path/to/mutation.json`. `survivors` lists the faults no test caught; `shard` and `targets` print the file lists the workflow uses.
- Adding a package (M3 onwards): give it a `stryker.config.json`, a cron in `on.schedule`, an entry in the "Pick packages" step, and a floor. `scripts/check-mutation-score.test.ts` checks that every cron picks a package and that every picked package has a floor.

## Versions

| Package                               | Version        | Why                                                               |
| ------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `@stryker-mutator/core`               | 10.1.1 (exact) | Latest release, published 23 October 2026. Needs Node 22 or later |
| `@stryker-mutator/vitest-runner`      | 10.1.1 (exact) | Must match core. Peer range `vitest >=2.0.0`                      |
| `@stryker-mutator/typescript-checker` | not added      | Does not work with TypeScript 7.0.2 (see below)                   |

Both are root dev dependencies only.

## What M0 found on `mortgage.ts`

Machine: an 8-core Apple laptop with 16 GB of memory, Node 22.12.0, Bun 1.4.4. Stryker used 7 test runner processes. Other agent sessions were using the same machine at the time.

| Figure                                          | Value                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Faults generated                                | 519                                                                                                                                  |
| Killed                                          | 281                                                                                                                                  |
| Timed out (counted as caught)                   | 8                                                                                                                                    |
| Survived                                        | 220                                                                                                                                  |
| No coverage (no test runs the line)             | 10                                                                                                                                   |
| Errors                                          | 0                                                                                                                                    |
| Mutation score                                  | 55.68% (56.78% of covered faults)                                                                                                    |
| Tests in the first run                          | 564, from the test files Vitest finds related to `mortgage.ts`                                                                       |
| Tests run per fault, on average                 | 9.2 to 9.3                                                                                                                           |
| Static faults (module-level, every test reruns) | 25, which Stryker estimates take 91% of the test time                                                                                |
| Wall time, full run                             | 22.5 s and 70.2 s in two identical runs (Stryker's own figure: 21 s and 67 s). The difference is load from other work on the machine |
| Wall time, repeat run with nothing changed      | 10.3 s (Stryker's own figure: 8 s), all 519 results reused from the incremental file                                                 |

The two full runs gave the same counts, and the repeat run reported them unchanged.

Survivors by function, with line numbers in `packages/finance-engine/src/mortgage.ts` at `5fffbfa03`. A line with no note has one survivor; "x3" means three survivors on that line; "nc" marks faults with no coverage.

| Where                              | Survived | No coverage | Lines                                                                                                                                                                                                                      |
| ---------------------------------- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repaymentPerMonth` (not exported) | 8        | 0           | 21 (x8)                                                                                                                                                                                                                    |
| `projectAmortisedBalance`          | 2        | 0           | 74 (x2)                                                                                                                                                                                                                    |
| `calculateLtvMilestones`           | 23       | 0           | 92 (x3), 95, 97, 98 (x5), 104 (x2), 107 (x8), 108 (x3)                                                                                                                                                                     |
| `calculateMortgageAmortization`    | 44       | 0           | 133, 136 (x2), 144 (x2), 148 (x2), 157 (x5), 160, 162 (x4), 167 (x3), 169, 172 (x2), 173, 187 (x4), 189, 191, 192 (x2), 196 (x4), 200 (x2), 201 (x2), 209 (x2), 211 (x2)                                                   |
| `calculateMortgageVsIsa`           | 45       | 1           | 228, 229 (x2), 232 (x2), 233, 235 (nc), 240 (x5), 241 (x2), 243, 244 (x2), 251 (x2), 252 (x2), 253, 256, 259, 260, 261, 264, 267, 268 (x2), 269 (x2), 272 (x2), 273 (x2), 276 (x2), 277 (x2), 278, 279, 280 (x2), 281 (x2) |
| `calculateMortgagePayment`         | 4        | 0           | 298, 301 (x3)                                                                                                                                                                                                              |
| `calculateMortgageCostSummary`     | 13       | 0           | 324, 326 (x4), 328 (x3), 329, 333 (x4)                                                                                                                                                                                     |
| `simulateMortgageOverpayment`      | 47       | 4           | 373 (nc), 374 (x11), 376 (x2), 385 (x3), 392 (x2), 393, 395, 397 (x2, plus 1 nc), 398 (nc), 401, 403, 409, 415, 416 (x2), 417, 418, 421, 426, 428, 429, 430, 433 (x2), 434, 440 (x4, plus 1 nc), 444, 445, 446 (x2), 447   |
| `compareMortgageOverpayVsSave`     | 34       | 5           | 498, 501 (x4), 503 (x2), 514 (x4), 515, 516, 517 (x4), 519, 527, 528 (plus 1 nc), 529 (nc), 530 (x2 nc), 532 (x2), 533, 537, 538, 540, 543 (nc), 547, 554 (x2), 555 (x2), 556, 557 (x2)                                    |
| Total                              | 220      | 10          | 115 lines                                                                                                                                                                                                                  |

These are not triaged. Some will be equivalent (the changed code behaves the same for every input), and some may be faults TypeScript would reject, because no type checker runs (see below). Triage and kill tests are M2.

## What M2 part B measured (19 November 2026)

Part B wrote tests for the tax and pay files: `uk-*`, `tax-*`, `section24.ts`, `savings-interest.ts`, `workplace-pension.ts`, `paye-salary-for-tax.ts` and the four tax selectors in `picture/selectors`. The owner approved tests that assert tax figures on 19 November 2026; every new figure is worked by hand with its GOV.UK or legislation source in a comment, and the owner signs the figures off in the part B PR. Part B also settled the three faults part A had left as "Tax gate".

Both runs were forced, on branch `e41-m2-kill-tests-b` after PRs 807, 808 and 810.

| Figure                                           | Laptop, one run                   | CI, 8 shards (run 44609048418)      |
| ------------------------------------------------ | --------------------------------- | ----------------------------------- |
| Faults                                           | 11,940                            | 11,940                              |
| Killed                                           | 11,181                            | 11,103                              |
| Of those, killed only by a test's own time limit | 784                               | 0                                   |
| Timed out                                        | 96                                | 139                                 |
| Survived                                         | 597                               | 632                                 |
| No coverage                                      | 59                                | 59                                  |
| **Stryker's score**                              | **94.50%**                        | **94.21%**                          |
| Score without time-limit kills and timeouts      | **93.04%** (see below)            | 93.04%                              |
| Stryker time                                     | 106 min (laptop under heavy load) | about 20 min for the whole workflow |

- The laptop was so loaded that the two self-timing tests (`uk-tax-year.property.test.ts`, 5,000 ms; `uk-what-if.property.test.ts`, 250 ms) failed first for 784 faults. For each of those, and for each timeout, the honest figure counts the fault as caught only when an earlier run on identical source saw a real assertion fail on it (659 time-limit kills and some timeouts qualify). Everything else counts as not caught: 830 faults, each with a ledger row.
- The floor. `scripts/mutation-baseline.json` sets the engine floor at **92%**: floor(93.04) - 1. CI's figure without timeouts is also 93.04%.
- After the independent review, two assertions that pinned possible bugs were removed (investment fees taken off savings interest before tax; a Plan 1 and Plan 2 repayment put wholly on Plan 1). That leaves two more faults not caught, so the honest figure is 93.03% and the floor stays at 92.
- The ledger's "Timeout" class records faults a test does catch but that Stryker reported as timeouts; its "Tax gate" class now holds only the Scottish personal savings allowance band edge, which awaits a ruling (E25).

## What M2 part A measured (19 November 2026)

Tests were written for the engine files outside tax and pay: 46 files, from `health-score.ts` (35% before) to the `picture` selectors. Every expected figure is worked by hand in a comment beside it (AGENTS.md section 14). Faults that no honest test can catch are in the [triage ledger](./mutation-triage.md) with a reason. The property tests in `retirement.test.ts` and `uk-tax.property.test.ts` now have a fixed seed, so their results repeat.

Both runs were forced (no saved results), on branch `e41-m2-kill-tests-a`.

| Figure                                      | Before (M1 laptop) | Laptop, one run | CI, 8 shards (run 44583684783) |
| ------------------------------------------- | ------------------ | --------------- | ------------------------------ |
| Faults                                      | 11,863             | 11,918          | 11,916                         |
| Killed                                      | 8,208              | 10,338          | 10,305                         |
| Timed out (counted as caught)               | 66                 | 52              | 265                            |
| Survived                                    | 3,092              | 1,342           | 1,162                          |
| No coverage                                 | 470                | 167             | 167                            |
| **Stryker's score**                         | **69.91%**         | **87.32%**      | **88.83%**                     |
| Score without time-limit kills and timeouts | not measured       | **86.07%**      | 86.60%                         |
| Stryker time                                | 66 min             | 65 min          | 20 min for the whole workflow  |

- 97 faults on the laptop were "killed" only by a test's own time limit: the 5,000 ms sweep in `uk-tax-year.property.test.ts` and the 250 ms curve in `uk-what-if.property.test.ts` failed for being slow, not for a wrong figure. All are in tax files (80 in `uk-tax-thresholds.ts`). CI had none. They are not counted as caught.
- CI timed out 265 faults against 52 on the laptop; 109 of CI's are in `tax-rules.ts`, where the laptop shows the same faults as survivors. Part B triages them.
- The floor. `scripts/mutation-baseline.json` sets the engine's floor at **85%**: floor(86.07) - 1, from the laptop score with time-limit kills and timeouts left out. It is the lowest honest figure, so a later run that times out fewer faults does not fail with no code change.
- After part A, 1,461 faults are not caught on the laptop (survived or no coverage), counting re-measures of `profile.ts` and `psa-band.ts` after PR 808, of `tax-calculator.ts` and `section24.ts` after the Section 24 fix, of `debt-payoff.ts` after the review fixes, and of the two housing selectors after their last tests. With them the score without time-limit kills and timeouts is 86.10%, so the floor of 85 holds. 435 of those faults are in the files part A covered, and each has a row in the ledger (264 rows, as one row may cover several faults on a line). The other 1,026 are in the tax and pay files, for part B.

## What M1 measured on the whole engine

### On `main` after audit slices 4 to 6 (the floor comes from these)

PRs 791, 797 and 798 changed 17 engine files after the first measurement, so the engine was measured again on this branch rebased onto them (commit `49a9e7fa8`). Both runs started with no saved results.

| Figure                        | CI, 8 shards (run 44558249413, attempt 2) | Laptop, one run                                     |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------- |
| Faults                        | 11,863 in 69 files                        | 11,863 in 69 files                                  |
| Static (module-level) faults  | not read                                  | 4,743 (40%)                                         |
| Killed                        | 8,125                                     | 8,208                                               |
| Timed out (counted as caught) | 235                                       | 66                                                  |
| Survived                      | 3,006                                     | 3,092                                               |
| No coverage                   | 470                                       | 470                                                 |
| Errors                        | 27                                        | 27                                                  |
| **Mutation score**            | **70.63%**                                | **69.91%**                                          |
| Score of covered faults       | 73.55%                                    | 72.80%                                              |
| Stryker time                  | 2 min 36 s to 19 min 13 s per shard       | 65 min 39 s (load average 12 to 34 from other work) |
| Whole workflow run            | 20 minutes                                | not applicable                                      |

Of the 11,863 faults, 188 had a different result in the two runs:

- 173 are timeouts.
- 14 were killed on the laptop and survived on CI. 13 of them were "killed" by a test's own time limit failing on the loaded laptop (in `uk-what-if.ts` 7, `uk-tax-thresholds.ts` 4, `uk-take-home.ts` 1 and `uk-hicbc.ts` 1). The other one, in `retirement.ts`, was killed by the unseeded property test in `retirement.test.ts` ("Property failed after 16 tests"), which M0 flagged.
- 1 was killed on CI only: the same fake-timer case in `uk-tax-year.ts` as in the first measurement.

The floor. `scripts/mutation-baseline.json` sets the engine's floor at **68%**: floor(69.91) - 1, from the lower of the two runs. A floor from the CI run (69%) could fail a later run that happened to time out fewer faults, with no code change.

Files with the most faults no test caught on CI (survived plus no coverage): `retirement.ts` 285, `profile.ts` 284, `debt-payoff.ts` 264, `mortgage.ts` 230, `tax-calculator.ts` 218, `health-score.ts` 216 (score 35.33%), `portfolio.ts` 156. The weekly job summary lists the top 15.

### First measurement, before the rebase

Two full runs of the same engine source and config (branch commit `c82c6b53d`): one on CI in eight shards, one unsharded on the laptop.

| Figure                              | CI, 8 shards (run 44544787241)                                 | Laptop, one run                                                                                   |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Machine                             | `ubuntu-latest`, 4 test runner processes per shard, Node 24.22 | 8-core Apple laptop, 7 test runner processes, Node 22.12.0, load average 24 to 33 from other work |
| Files instrumented                  | 69 (68 with faults)                                            | 69 (68 with faults)                                                                               |
| Faults                              | 11,577                                                         | 11,577                                                                                            |
| Static (module-level) faults        | 21% to 53% per shard                                           | 4,483 (39%), estimated at 99% of the test time                                                    |
| Killed                              | 7,905                                                          | 7,912                                                                                             |
| Timed out (counted as caught)       | 181                                                            | 42                                                                                                |
| Survived                            | 2,992                                                          | 3,124                                                                                             |
| No coverage                         | 472                                                            | 472                                                                                               |
| Errors                              | 27                                                             | 27                                                                                                |
| **Mutation score**                  | **70.01%**                                                     | **68.87%**                                                                                        |
| Score of covered faults             | 72.99%                                                         | 71.80%                                                                                            |
| Stryker time                        | 3 min 37 s to 18 min 13 s per shard, about 72 minutes in all   | 55 min 37 s                                                                                       |
| Whole workflow run, start to finish | 19 minutes                                                     | not applicable                                                                                    |
| Incremental file                    | 210 to 292 KB per shard in the Actions cache (compressed)      | 17.4 MB for the whole package                                                                     |
| HTML and JSON report                | 3.0 to 5.0 MB per shard artifact                               | 8.6 MB and 8.4 MB                                                                                 |

`mortgage.ts` alone scored 55.68% in both runs, the same as in M0.

A second CI run (44554616807) on a commit that added one comment line to `check-in-day.ts` restored each shard's incremental file. Each shard took 30 to 56 seconds, and the whole run under 2 minutes. That run is the one that found shards carrying over moved files (previous section). Scored again with the fix, its eight reports give the same 11,577 faults and 70.01%.

The pull request job, on the same commit, mutated only `check-in-day.ts`: 86 faults, 10 seconds of Stryker time, 36 seconds for the job.

How the two runs differ. Comparing every fault by file, position, fault type and replacement, 147 of the 11,577 faults had a different result:

- 139 are timeouts. 138 faults survived on the laptop and timed out on CI, and one was killed on the laptop and timed out on CI. Stryker sets each fault's time limit from the first test run, so a timeout depends on the machine. Timeouts count as caught, which is most of why CI scores higher.
- 7 were killed on the laptop and survived on CI (4 in `uk-rule-sources.ts`, 3 in `uk-tax.ts`). Every one was "killed" by a test that times itself: `uk-tax-year.property.test.ts` expects a sweep to finish in under 5,000 ms, and `uk-what-if.property.test.ts` expects a curve in under 250 ms. On the overloaded laptop these took 5,017 to 6,405 ms and 252 to 335 ms, so the test failed for being slow, not for a wrong figure. M2 should treat these as not caught.
- 1 was killed on CI and survived on the laptop: a static fault in `uk-tax-year.ts` line 116, caught on CI by the fake-timer test for the 5/6 April rollover. Not explained.

Sharding did not change which tests caught which faults: no fault moved between killed and survived for any other reason.

The plan estimated 30 to 90 minutes for the engine's full run. The two unsharded runs took 56 and 66 minutes, inside that range. Sharded on CI it takes about 20 minutes of wall time.

## Answers to the M0 questions

**Does the Vitest runner work on Vitest 5.1.0 and TypeScript 7.0.2?** Yes. The first test run and every fault run completed with Vitest 5.1.0, with no errors. Vitest strips types without checking them, so TypeScript 7 does not get in the way of the runner.

**What Node version is needed, and what does CI have?** Stryker 10.1.1 declares `node >=22.0.0`. Locally it ran on Node 22.12.0. CI jobs run on the `ubuntu-26.04` image (from the "Set up job" log of CI run 44527588500 on `main`). No workflow has a `setup-node` step, so jobs use the image's Node. Jobs in that run used four builds of the image. The readme for one of them (`ubuntu26/20261111.196` in `actions/runner-images`) lists Node.js 24.22.2, which meets Stryker's need. The image can change under us, so M1 should still pin Node with `actions/setup-node`.

**Does the sandbox copy work in this Bun workspace, or is `inPlace` needed?** `inPlace` is needed today. Two separate problems:

1. Plugins. Stryker finds plugins by listing the folder next to its own package. Bun installs packages into an isolated store (`node_modules/.bun/...`), where the runner is not a neighbour, so Stryker warned `Unknown stryker config option "vitest"`: it had not found the runner plugin. Fix, now in the config: list the plugin by name in `plugins`. Node then resolves it from the root `node_modules`.
2. The sandbox. By default Stryker copies the package into `.stryker-tmp/sandbox-*` and rewrites relative paths in `tsconfig.json` so they still work from the copy. That rewrite loads the `typescript` package's programming interface, which TypeScript 7 does not have. The run stopped with `TypeError: ts.parseConfigFileTextToJson is not a function`. With the rewrite skipped (by pointing `tsconfigFile` at a missing file, as a test only), every test file then failed with `Failed to load tsconfig '../../packages/typescript-config/base.json': Tsconfig not found`, because the engine's `tsconfig.json` extends a relative path that is wrong from inside the copy. `inPlace` skips both the copy and the rewrite.

A likely way back to the sandbox, not tried: make the engine's `tsconfig.json` extend `@repo/typescript-config/base.json` by package name, so the path works from the copy, and stop Stryker loading the TypeScript interface. That touches a shared config, so it is left to M1. Panda's `styled-system` and web's imports from `../../scripts` were not tested: M0 touched only the engine.

**Can the runner target a single Vitest project?** Not by an option. The runner's options are `configFile`, `dir`, `related` and `pool`. It passes `configFile` to Vitest and then runs every project that config defines (`vitest-test-runner.js`, the `init()` and `run()` methods). So web's M5 run needs its own small config file that defines only the `unit` project, passed as `vitest.configFile`. This is read from the runner's source, not run against web.

**Does the TypeScript checker work?** No. With `@stryker-mutator/typescript-checker` 10.1.1 the run stopped at start-up with `TypeError: Cannot read properties of undefined (reading 'fileExists')`. Its `experimentalNativePreview` option, with TypeScript 7.0.2 installed under the `@typescript/native` alias as its docs say, stopped with `TypeError: Cannot read properties of undefined (reading 'readFile')`. Both come from the plugin calling the TypeScript programming interface, which TypeScript 7 does not have. The plugin and the alias were removed again. Without a checker, a fault that would not compile is still run as a test, so it costs time and may show as a survivor that triage must recognise.

**How do `fast-check` property tests behave under per-test coverage?** As normal tests. A full run on `src/picture/selectors/housing-cost.ts`, whose property tests use a fixed seed, gave the same result twice: 224 faults, 183 killed, 40 survived, 1 no coverage, score 81.70%, in 64 s and 54 s. The status of each fault was identical between the two runs. Two cautions:

- Six engine test files use `fast-check`. Four pass a fixed `seed`. Two do not: `src/retirement.test.ts` and `src/uk-tax.property.test.ts`. A fault in code they reach could be killed in one run and survive the next. M2 should give them a seed before trusting scores for that code. (`src/uk-what-if.property.test.ts` mentions `fast-check` only in a comment and uses its own seeded generator.)
- 148 of the 224 faults in that module (66%) were static (module-level), and Stryker estimated they took 96 to 97% of the test time. The runs averaged 71 to 72 tests per fault. Property tests make static faults expensive. Stryker's `ignoreStatic` option would skip them, but that is a form of ignore list, so it is not used.

**How big is the incremental file?** 811 KB for one module (519 faults, 560 tests in the file). The HTML report was 803 KB and the JSON report 569 KB. A whole-package size is not measured; it grows with faults and tests, so it should be measured in M1 before choosing the Actions cache.

**How can `mutate` be limited to changed files in a pull request?** There is no "since" option, but two things work. `--mutate` on the command line replaces the config's list, and an entry can carry a line range (`file:startLine-endLine`). A test run with `--mutate "src/mortgage.ts:32-44"` instrumented 3 faults instead of 519. So the M1 pull request job can build the list from `git diff --name-only` (source files only, no tests) and, if wanted, line ranges from the diff hunks. With incremental mode on as well, unchanged faults are reused rather than rerun.

## Known limits

- `inPlace` writes into real source files during a run. Fine on a CI runner. Locally it means not editing the mutated file mid-run.
- No type checking of faults (TypeScript 7).
- Browser-mode Vitest (the Storybook project) cannot be mutation-tested; this is Stryker's documented limit and was not retested.
- The `related` option relies on test files importing the source file. For the engine this held: the first run picked 564 related tests. Backend specs that reach code over HTTP may not be found this way (M4).
- Timings are from one laptop under load from other work, so they vary by a factor of three.

## Not verified

- The weekly schedule itself. A scheduled trigger only fires from `main`, so it cannot run before this merges. On the branch, a temporary `push` trigger ran the same jobs three times (runs 44544787241, 44554616807 and 44555258134), and it was removed before review. Those runs did not pass `--force`, which only the schedule or a ticked `force` adds; the first run had no saved results, so it ran every fault anyway. The first Sunday run after merge is the proof.
- The manual start (`workflow_dispatch`). GitHub only offers it for workflows on the default branch. The "Pick packages" step that handles its input ran only through the temporary trigger, as `all`.
- The pull request job's `git diff HEAD^1 HEAD` was changed after its CI runs (they used the base commit), so the new form has not run on CI.
- A rerun attempt of a weekly run. Its cache save reuses a key that already exists; I expect `actions/cache/save` to warn and carry on without saving, but this was not tried.
- How much CI timeouts vary from run to run on the same code. The two CI full runs were on different code (181 and 235 timeouts).
- Why the fake-timer test caught one fault on CI but not on the laptop.
- Results from the unseeded property tests in `src/retirement.test.ts` and `src/uk-tax.property.test.ts` were not checked for run-to-run change.
- Web's single-project config and the sandbox in web or `packages/ui` were not run.
- The `tsconfig` package-name fix for the sandbox was not tried. `inPlace` stays.
- Whether standard runners are free for this public repository was not checked on the billing page.

## Recommendation for M1 (from M0)

Go, with changes:

1. Keep `inPlace: true` and the explicit `plugins` list in every package's config, or first try the package-name `extends` fix to bring the sandbox back.
2. No TypeScript checker until the plugin supports TypeScript 7. Triage notes say when a survivor would not compile.
3. Pin Node 22 or later with `actions/setup-node` in the mutation workflow.
4. Measure the engine's full run before choosing the weekly schedule. The plan's estimate of 30 to 90 minutes is still an estimate.
5. Seed the property tests in `src/retirement.test.ts` and `src/uk-tax.property.test.ts` (M2) before trusting scores for the code they reach.
6. For web (M5), add a Stryker-only Vitest config with just the `unit` project.

What M1 did with it: kept `inPlace` and the `plugins` list (1); added no type checker (2); pins Node 24 with `actions/setup-node` (3); measured the full run before choosing the schedule, which led to the shards (4). Items 5 and 6 are for M2 and M5. M2 should also treat kills that come only from a test's own time limit (above) as not caught.
