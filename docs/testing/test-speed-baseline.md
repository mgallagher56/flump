# Test speed baseline (E41 slice P0)

Taken on 19 November 2026 for [E41](../audit/plans/E41-mutation-testing-and-test-speed-plan.md). Nothing was changed to take it: no test, no CI job. Every figure says whether it was measured, when, and over how many runs. "Not measured" means exactly that. Estimates are labelled as estimates.

Re-take any of it with `bun scripts/test-timings.ts` (usage at the top of the file). It needs no secret: CI figures come from the `gh` CLI you are already signed in to.

```bash
bun scripts/test-timings.ts ci --limit 20 --logs --json-out ci.json   # CI jobs, steps, Turbo, browser cache
bun scripts/test-timings.ts run packages/ui                          # one local suite, JSON plus split
bun scripts/test-timings.ts run apps/web --project unit
```

## 1. The two numbers for decision 9

**Targets (owner, 19 November 2026).** Asked "Accept the two proposed test speed targets?", the owner answered "Yes, accept both":

- A pull request's required checks: **typical 3 min 30 s, worst 6 min**, measured as below (the slowest required job in a run; median and maximum over recent runs).
- A local web unit run: **2 min on a quiet machine**.

They are targets to report against, not CI gates. The baseline they are measured from:

| Number                                                                         | Today (measured, 19 Nov 2026)                                                                                                                                                                                                                                                               | What the plan's ranked fixes might plausibly save (estimate)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time for a pull request's required checks                                      | Typical: **4 min 17 s** (median over 20 runs of the longest single job in each run). Worst: **8 min 37 s** (the same measure; whole-run wall time from first job start to last job end was a median of 5 min 16 s and a worst of 13 min 18 s, but that worst run includes a re-run of jobs) | P1 should remove the long tail: the worst run's browser install took 397 s of its 517 s, so the worst case could fall to about 7 min (the next-worst job in the 20 runs took 416 s, for reasons this baseline did not trace). P3 may cut 40 to 60 s from the web job. The typical run is set by three jobs of about 3 to 3.5 minutes (both Storybook jobs and Vitest web), so the typical figure moves only if all three move. A plausible target for typical is about 3 min 30 s, not lower, unless the Storybook jobs change shape (P5, shards) |
| Local web unit test run (`apps/web`, `vitest run --project unit`, no coverage) | Median **2 min 55 s** over 3 runs: 113 s, 175 s and 289 s, on an Apple silicon laptop (8 cores) shared with other working sessions, so the spread is mostly load                                                                                                                            | P3 (node environment for tests with no DOM, narrower setup mocks) targets the 26% environment and 12% setup share: roughly 25 to 60 s off the median. Sharding (P5) does not help a local run. A plausible target is about 2 min on a quiet machine                                                                                                                                                                                                                                                                                               |

Read the first row with care: it measures the longest job, which is the time the checks need with no queueing and no re-run. GitHub's own wall clock for a run is longer because of queueing and re-runs.

## 2. How this was measured

| Data                                              | How                                                                                                                                                                                                                                     | Runs                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| CI jobs and steps                                 | `gh run view <id> --json jobs` over the 20 most recent finished (passed or failed, not cancelled) pull request runs of `ci-pipeline.yml`, taken 19 Nov 2026 about 13:30 UTC. Branches: audit slices, phone fixes, E41 plan, release PRs | 20                                                                                                   |
| Turbo cache hits per job                          | Counted from `cache hit` and `cache miss` lines in the job logs (`gh run view --log --job`). GitHub returned no log text for 9 of the 20 runs, so those have no Turbo figures                                                           | 11 of 20                                                                                             |
| Browser cache hit or miss                         | The "Cache Playwright browsers" step's log lines, same limit as above                                                                                                                                                                   | 35 job runs with a hit, 25 with no log (unknown); no misses were seen in the logs that were returned |
| Local suites                                      | Vitest 5.1.0 with the default and JSON reporters, one package at a time, after `bunx turbo run build generate`                                                                                                                          | 3 per package                                                                                        |
| Split of import, environment, setup and test time | Vitest's final "Duration" line. Vitest 5 prints shares, not times; they are shares of summed worker time, not of wall time, so they can add to more than the wall clock when files run in parallel                                      | the last of the 3 runs, except web (all 3 agree within a point or two)                               |
| Playwright                                        | Only the smoke project's step time from the job step list and the log. No JSON report is written in CI (the list and html reporters are used), so per-project durations for visual, a11y, interaction and sweep were **not measured**   | 20 (step time)                                                                                       |

Local machine: an Apple silicon laptop (M2 class, 8 cores, 16 GB), macOS, Bun 1.4.4, other Claude sessions building and testing in separate worktrees at the same time. Treat local figures as having 30 to 60% noise. The first attempt ran before the workspace packages were built and was discarded: it failed 209 MCP tests and others on missing built output, and the figures here are from the rerun with all tests passing.

Not run locally, by instruction: the full E2E, visual, a11y, interaction and sweep suites, and the Storybook (browser mode) project. Backend database specs skip without `TEST_DATABASE_URL`, so the local backend run executed 1,542 of 2,009 tests; the rest need Postgres and run in CI only. The local backend figure therefore leaves out most of what makes the CI backend run slow.

## 3. Per package

Local figures: command wall time including start-up, three runs, apps run by `vitest run` (web with `--project unit`). CI figures: the plan's section 2 reading from one run (44514206119, on a pull request branch, coverage on). **Those CI per-package numbers were not re-taken here**: CI per-package timing is not in the job step data and needs a log parse per package that the script does not do. The CI job totals in section 4 are measured.

| Package                           | Files | Tests             | Local run 1, 2, 3   | Local median | CI (plan, one run)    |
| --------------------------------- | ----- | ----------------- | ------------------- | ------------ | --------------------- |
| `apps/web` unit                   | 328   | 3,621 (8 skipped) | 175 s, 113 s, 289 s | 175 s        | 155 s                 |
| `apps/backend` (DB specs skipped) | 142   | 2,009 (1,542 ran) | 102 s, 47 s, 49 s   | 49 s         | 281 s (with database) |
| `packages/ui`                     | 122   | 1,402             | 54 s, 34 s, 31 s    | 34 s         | 105 s                 |
| `apps/marketing`                  | 36    | 416               | 12 s, 11 s, 12 s    | 12 s         | 71 s                  |
| `packages/finance-engine`         | 77    | 1,661             | 3.6 s, 5.9 s, 5.8 s | 5.8 s        | 46 s                  |
| `packages/mcp`                    | 22    | 639               | 3.4 s, 3.6 s, 3.7 s | 3.6 s        | 47 s                  |
| `packages/api-contract`           | 13    | 204               | 1.1 s, 1.1 s, 1.0 s | 1.1 s        | 11 s                  |
| `packages/tokens`                 | 4     | 466               | 0.7 s, 0.6 s, 0.6 s | 0.6 s        | not matched           |
| `packages/banking`                | 7     | 103               | 0.8 s, 0.8 s, 0.8 s | 0.8 s        | under 1 s             |
| `packages/observability`          | 6     | 254               | 0.8 s, 0.5 s, 0.5 s | 0.5 s        | 5 s                   |
| `packages/api-client`             | 3     | 86                | 0.7 s, 0.6 s, 1.1 s | 0.7 s        | not matched           |
| `packages/format`                 | 3     | 80                | 1.3 s, 0.6 s, 0.5 s | 0.6 s        | not matched           |
| `packages/business-details`       | 1     | 11                | 0.5 s, 0.4 s, 1.3 s | 0.5 s        | not matched           |

The local machine is much faster than a CI runner for the small packages (engine 6 s here against 46 s in CI; CI also runs coverage and cold file caches), so only the shape is comparable, not the ratio.

### Time split (measured, shares of summed worker time)

| Package                           | Import | Environment | Tests | Setup     | Transform | Worker |
| --------------------------------- | ------ | ----------- | ----- | --------- | --------- | ------ |
| `apps/web` unit                   | 29%    | 27%         | 21%   | 12%       | 10%       | 1%     |
| `packages/ui`                     | 30%    | 45%         | 22%   | not shown | 2%        | 2%     |
| `apps/marketing`                  | 41%    | 26%         | 20%   | not shown | 12%       | 1%     |
| `apps/backend` (DB specs skipped) | 87%    | not shown   | 9%    | not shown | 2%        | 2%     |
| `packages/finance-engine`         | 49%    | not shown   | 42%   | not shown | 6%        | 3%     |
| `packages/mcp`                    | 42%    | not shown   | 50%   | not shown | 8%        | 1%     |

Two things differ from the plan's section 2. The plan read tests at 76% of the CI backend run; here they are 9%, because the database specs are skipped locally, so the database specs are most of the CI backend time (that is the plan's rank 2 and 11 question, and this baseline cannot settle it from a laptop). Import, not tests, is the largest share in every package except `mcp`.

The slowest 20 files for each package that takes more than a few seconds are in the appendix. For the nine packages under 6 s, no single file matters.

## 4. CI jobs and steps (measured, 20 pull request runs, 19 Nov 2026)

Whole run:

| Measure                                    | Min        | Median     | Max         |
| ------------------------------------------ | ---------- | ---------- | ----------- |
| Slowest single job in the run              | 2 min 13 s | 4 min 17 s | 8 min 37 s  |
| First job start to last job end (all jobs) | 2 min 22 s | 5 min 16 s | 13 min 18 s |

The all-jobs wall time equals the required-checks wall time here because every job in this workflow is a required check. The maximum wall time (13 min 18 s) is a run whose slowest job took 3 min 29 s: the rest is a re-run. The next worst, 10 min 10 s, is a run whose slowest job took 2 min 13 s. So wall time overstates what the checks need.

Jobs, 20 runs each (slowest median first):

| Job                          | Min       | Median     | Max        |
| ---------------------------- | --------- | ---------- | ---------- |
| Storybook a11y (light)       | 31 s      | 3 min 32 s | 7 min 45 s |
| Vitest web                   | 33 s      | 3 min 18 s | 4 min 12 s |
| Storybook a11y (dark)        | 28 s      | 2 min 58 s | 8 min 37 s |
| E2E smoke                    | 2 min 7 s | 2 min 44 s | 6 min 15 s |
| Docker images                | 24 s      | 2 min 12 s | 2 min 51 s |
| Vitest backend and packages  | 28 s      | 68 s       | 6 min 0 s  |
| Lint and type check          | 25 s      | 50 s       | 68 s       |
| Ops script tests             | 36 s      | 44 s       | 63 s       |
| Build                        | 25 s      | 30 s       | 38 s       |
| Dependency audit             | 15 s      | 20 s       | 32 s       |
| Vitest Tests (the aggregate) | 2 s       | 3 s        | 5 s        |

A 30-odd second minimum is a full Turbo cache hit.

Steps that matter (min, median, max; 20 runs unless a count is shown):

| Step                                           | Min  | Median     | Max        |
| ---------------------------------------------- | ---- | ---------- | ---------- |
| Vitest web: run vitest with coverage floors    | 1 s  | 2 min 40 s | 3 min 42 s |
| Storybook a11y (light): the tests              | 1 s  | 116 s      | 2 min 37 s |
| Storybook a11y (dark): the tests (18 runs)     | 1 s  | 99 s       | 2 min 30 s |
| Docker images: build images (17 runs)          | 65 s | 92 s       | 115 s      |
| E2E smoke: run smoke tests                     | 79 s | 89 s       | 114 s      |
| Vitest backend and packages: run vitest        | 1 s  | 37 s       | 5 min 21 s |
| Storybook a11y (light): build smoke            | 0 s  | 33 s       | 44 s       |
| Install Chromium, Storybook dark               | 8 s  | 20 s       | 6 min 37 s |
| Install Chromium, Storybook light              | 8 s  | 17 s       | 4 min 21 s |
| Install Chromium, E2E smoke                    | 8 s  | 13 s       | 4 min 7 s  |
| Setup Bun and install dependencies (every job) | 6 s  | 9 to 12 s  | 14 to 20 s |

### Install Chromium, all 60 job runs

Across 20 runs and three jobs each, the step took 3,440 s in total. The browser cache was used for it as follows.

| Browser cache              | Job runs | Step durations in seconds, sorted                                                                                                  |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Hit                        | 35       | 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 11, 12, 12, 13, 13, 13, 14, 15, 16, 16, 16, 20, 25, 38, 41, 47, 47, 64, 283, 328 |
| Unknown (log not returned) | 25       | 8, 9, 9, 10, 11, 12, 16, 18, 23, 23, 25, 40, 48, 61, 74, 75, 92, 98, 108, 112, 232, 247, 249, 261, 397                             |

Two readings. The step takes about 10 s on a cache hit when the Ubuntu mirror behaves, which is the cost of `playwright install-deps` that decision 13 wants to skip. And the long tail is the package mirror, not the browser: the six slowest samples (397, 328, 283, 261, 249 and 247 s) are 1,765 s, 51% of all the time spent in this step; two of them (328 s and 397 s) sat in the slowest job of their run. Only 35 of the 60 logs say the cache hit; none of the returned logs showed a miss, and the rest are unknown.

### Turbo cache hits (11 of 20 runs had logs)

Task counts as hit / miss per job. Typical for a pull request that changes web code: Vitest web 12/1, Lint and type check 17 to 25 hits with 2 to 10 misses, Storybook light 20/2, Storybook dark 10/1, E2E smoke 14/0, Build 6 to 13 hits with 1 to 8 misses, Vitest backend and packages 16 to 23 hits with 0 to 7 misses. A pull request that only changes docs gets all hits (the E41 plan runs: Lint 27/0, Vitest web 13/0, backend 23/0). The one miss in a web run is the web test task itself, which is why the web job rarely escapes its 2 min 40 s.

## 5. Where the time goes, ranked (measured, with the evidence)

1. **The two Storybook a11y jobs and Vitest web set the pace.** Medians 3 min 32 s, 2 min 58 s and 3 min 18 s; together they are the slowest job in 12 of 20 runs. Storybook tests alone are 99 to 116 s per theme, plus 33 s for the build smoke (light only).
2. **Chromium install is cheap on a good day and expensive on a bad one.** About 10 s typical, and 6 of 60 samples cost 51% of the total. It was most of the slowest job in two of the 20 runs (328 s and 397 s, both Storybook dark), and 397 s of the worst required-check time (517 s). This is the cheapest fix to the variation (P1).
3. **Web test time is import, environment and setup, not tests.** 21% of worker time is tests; 29% import, 27% environment, 12% setup. The slowest file, `MortgageContainer.test.tsx`, is 25 s (in the slow run; the next is 11 s), so a few container tests stand out but the cost is spread over 328 files. (P3, P4.)
4. **UI and marketing are environment and import.** 45% environment in `packages/ui`, 26% in marketing. A node environment for files that do not touch the DOM is the lever (P3).
5. **Docker images (92 s) and E2E smoke (89 s test step) are steady** and rarely the slowest job; the E2E job is the slowest job in 4 of 20 runs.
6. **Backend in CI.** Cannot be ranked from here because the database specs do not run locally. The CI step median is 37 s and the maximum 5 min 21 s, a spread that follows Turbo cache hits (a miss runs about 5 minutes). Whether the 23 database files or the non-database files dominate a miss is **not measured**; it needs a CI log run with per-file durations (P2's first step).
7. **Setup Bun and install dependencies** is 9 to 12 s in every one of about 10 jobs a run, so roughly 100 s of runner time per run but off the critical path.

## 6. Not measured, and caveats

- Per-package CI wall time (taken from the plan, one run; not re-taken).
- Playwright per-project durations (visual, a11y, interaction, sweep): no JSON report in CI and those suites were not run locally.
- Storybook (browser mode) project durations other than the CI step time.
- Browser cache hit or miss for 25 of the 60 job runs, and Turbo counts for 9 of the 20 runs: GitHub returned no log text.
- Backend time split in CI (database specs).
- Local timings are from a shared laptop. Run to run spread is large (web 113 to 289 s). A repeat on a quiet machine would give tighter figures; ask for it if a target depends on it.
- The 20 runs are a snapshot: runs ranged over about two hours of 19 November, during which the package mirror was reported to be failing (E41 plan section 2). That makes the browser install tail look worse than a normal day. A second sample on another day would show how much.
- Coverage is on in CI and off in the local runs, which flatters the local figures.
- The local web run and others change `apps/web/sonar-report.xml` (the web config writes the JSON report there); it is git-ignored.

## Appendix: slowest 20 test files (local, run 3 of 3)

Times are each file's end minus start from the JSON report, so with files running in parallel they overlap and do not add up to wall time.

### apps/web (unit project, run 3 of 3, the slow one)

328 files, 3621 tests (3613 passed, 0 failed). Wall time 4 min 49 s.

Slowest 20 files:

| File                                                                                              | Time  |
| ------------------------------------------------------------------------------------------------- | ----- |
| apps/web/app/containers/mortgage/MortgageContainer.test.tsx                                       | 25 s  |
| apps/web/app/containers/tax/TaxContainer.test.tsx                                                 | 11 s  |
| apps/web/app/test/consistency/consistency.test.tsx                                                | 9.9 s |
| apps/web/app/features/budget/components/BudgetEditor/BudgetEditor.test.tsx                        | 7.4 s |
| apps/web/app/features/retirement/components/RetirementPlanner/RetirementPlanner.test.tsx          | 7.2 s |
| apps/web/app/features/settings/components/SettingsPage/SettingsPage.test.tsx                      | 6.9 s |
| apps/web/app/containers/budget/BudgetContainer.test.tsx                                           | 6.5 s |
| apps/web/app/routes/app.onboarding.test.tsx                                                       | 6.5 s |
| apps/web/app/features/debt/components/AddDebtDialog/AddDebtDialog.test.tsx                        | 6.3 s |
| apps/web/app/features/settings/components/ProfileTab/ProfileTab.test.tsx                          | 6.2 s |
| apps/web/app/features/dashboard/components/HomeDashboard/HomeDashboard.test.tsx                   | 6.2 s |
| apps/web/app/features/onboarding/components/OnboardingFlow/OnboardingFlow.test.tsx                | 5.8 s |
| apps/web/app/features/mortgage/components/MortgageEditDialog/MortgageEditDialog.test.tsx          | 5.7 s |
| apps/web/app/features/tax/components/TaxRecordDialog/TaxRecordDialog.test.tsx                     | 5.7 s |
| apps/web/app/features/budget/components/BudgetSetupWizard/BudgetSetupWizard.test.tsx              | 5.4 s |
| apps/web/app/features/savings/components/AddSavingsAccountDialog/AddSavingsAccountDialog.test.tsx | 5.4 s |
| apps/web/app/features/settings/components/AgeAndPaySection/AgeAndPaySection.test.tsx              | 5.3 s |
| apps/web/app/containers/pension/PensionContainer.test.tsx                                         | 5.3 s |
| apps/web/app/features/take-home/components/TakeHomeCalculator/TakeHomeCalculator.test.tsx         | 5.2 s |
| apps/web/app/components/dialogs/addEditAccountsDialog/EditAccountsDialog.test.tsx                 | 5.0 s |

### apps/backend (database specs skipped)

142 files, 2009 tests (1542 passed, 0 failed). Wall time 39 s.

Slowest 20 files:

| File                                                                      | Time  |
| ------------------------------------------------------------------------- | ----- |
| apps/backend/src/auth/workos-jwt.verifier.spec.ts                         | 0.3 s |
| apps/backend/src/security/rate-limit.integration.spec.ts                  | 0.3 s |
| apps/backend/src/observability/sentry.spec.ts                             | 0.2 s |
| apps/backend/src/observability/scrubbing-console-logger.spec.ts           | 0.1 s |
| apps/backend/src/testing/discoverMigrations.spec.ts                       | 0.1 s |
| apps/backend/src/observability/crash-policy.spec.ts                       | 0.1 s |
| apps/backend/test/observability/sentry-envelope.spec.ts                   | 0.1 s |
| apps/backend/src/migrations/migration-files.spec.ts                       | 0.1 s |
| apps/backend/test/observability/sentry-trace-envelope.spec.ts             | 0.1 s |
| apps/backend/src/observability/request-id.http.spec.ts                    | 0.1 s |
| apps/backend/src/shutdown.spec.ts                                         | 0.1 s |
| apps/backend/src/modules/banking/providers/provider-failure-modes.spec.ts | 0.0 s |
| apps/backend/src/security/receipt-validation.spec.ts                      | 0.0 s |
| apps/backend/src/modules/finance/account-intake.service.spec.ts           | 0.0 s |
| apps/backend/src/observability/request-context.middleware.spec.ts         | 0.0 s |
| apps/backend/src/config/v1-alias.middleware.spec.ts                       | 0.0 s |
| apps/backend/src/modules/module-boot.spec.ts                              | 0.0 s |
| apps/backend/src/modules/snapshots/liability-sign.golden.spec.ts          | 0.0 s |
| apps/backend/src/modules/tax/tax.controller.spec.ts                       | 0.0 s |
| apps/backend/src/modules/privacy/account-export.service.spec.ts           | 0.0 s |

### packages/ui

122 files, 1402 tests (1401 passed, 0 failed). Wall time 30 s.

Slowest 20 files:

| File                                                                                       | Time  |
| ------------------------------------------------------------------------------------------ | ----- |
| packages/ui/src/primitives/DatePicker/DatePicker.test.tsx                                  | 2.9 s |
| packages/ui/src/calculators/MarginalRateExplorer/MarginalRateExplorer.test.tsx             | 2.7 s |
| packages/ui/src/calculators/DebtSnowballCalculator/DebtSnowballCalculator.test.tsx         | 1.8 s |
| packages/ui/src/templates/PageTemplates/PageTemplates.test.tsx                             | 1.1 s |
| packages/ui/src/calculators/calculators.test.tsx                                           | 1.0 s |
| packages/ui/src/patterns/ConfirmDialog/ConfirmDialog.test.tsx                              | 1.0 s |
| packages/ui/src/tokens/architecture.laws.test.ts                                           | 0.9 s |
| packages/ui/src/calculators/MortgageVsIsaCalculator/MortgageVsIsaCalculator.test.tsx       | 0.8 s |
| packages/ui/src/patterns/MarginalRateChart/MarginalRateChart.test.tsx                      | 0.8 s |
| packages/ui/src/calculators/TaxTrapCalculator/TaxTrapCalculator.test.tsx                   | 0.7 s |
| packages/ui/src/calculators/Section24Calculator/Section24Calculator.test.tsx               | 0.6 s |
| packages/ui/src/primitives/Dialog/Dialog.test.tsx                                          | 0.6 s |
| packages/ui/src/calculators/ZeroPercentCliffCalculator/ZeroPercentCliffCalculator.test.tsx | 0.6 s |
| packages/ui/src/patterns/TakeHomeDeltaPanel/TakeHomeDeltaPanel.test.tsx                    | 0.6 s |
| packages/ui/src/calculators/StudentLoanCalculator/StudentLoanCalculator.test.tsx           | 0.5 s |
| packages/ui/src/primitives/Toast/Toast.test.tsx                                            | 0.5 s |
| packages/ui/src/primitives/Menu/Menu.test.tsx                                              | 0.5 s |
| packages/ui/src/patterns/TopBar/TopBar.test.tsx                                            | 0.5 s |
| packages/ui/src/foundations/DirectionCSignoff/DirectionCSignoff.test.tsx                   | 0.4 s |
| packages/ui/src/patterns/SimulatorSplitLayout/SimulatorSplitLayout.test.tsx                | 0.4 s |

### apps/marketing

36 files, 416 tests (416 passed, 0 failed). Wall time 8.2 s.

Slowest 20 files:

| File                                                                                   | Time  |
| -------------------------------------------------------------------------------------- | ----- |
| apps/marketing/src/pages/ToolPage/ToolPage.test.tsx                                    | 2.7 s |
| apps/marketing/src/social-meta.ssr.test.tsx                                            | 1.2 s |
| apps/marketing/src/pages/HomePage/HomePage.test.tsx                                    | 1.2 s |
| apps/marketing/src/components/Header/Header.test.tsx                                   | 1.2 s |
| apps/marketing/src/pages/PreviewPage/PreviewPage.test.tsx                              | 1.0 s |
| apps/marketing/src/pages/ToolsIndexPage/ToolsIndexPage.test.tsx                        | 0.7 s |
| apps/marketing/src/pages/McpPage/McpPage.test.tsx                                      | 0.7 s |
| apps/marketing/src/pages/SecurityPage/SecurityPage.test.tsx                            | 0.6 s |
| apps/marketing/src/pages/PricingPage/PricingPage.test.tsx                              | 0.5 s |
| apps/marketing/src/pages/NotFoundPage/NotFoundPage.test.tsx                            | 0.5 s |
| apps/marketing/src/pages/ContactPage/ContactPage.test.tsx                              | 0.5 s |
| apps/marketing/src/components/HomeFAQ/HomeFAQ.test.tsx                                 | 0.3 s |
| apps/marketing/server/ops.test.ts                                                      | 0.3 s |
| apps/marketing/src/components/Footer/Footer.test.tsx                                   | 0.2 s |
| apps/marketing/src/components/PayRiseTeaser/PayRiseTeaser.test.tsx                     | 0.2 s |
| apps/marketing/server/analytics.test.ts                                                | 0.2 s |
| apps/marketing/src/components/MonthlyPictureSection/MonthlyPictureSection.test.tsx     | 0.2 s |
| apps/marketing/server/security-txt.test.ts                                             | 0.1 s |
| apps/marketing/src/components/BaselineSnapshotPreview/BaselineSnapshotPreview.test.tsx | 0.1 s |
| apps/marketing/src/app-shell/ScrollManager.test.tsx                                    | 0.1 s |

### packages/finance-engine

77 files, 1661 tests (1660 passed, 0 failed). Wall time 4.9 s.

Slowest 20 files:

| File                                                                            | Time  |
| ------------------------------------------------------------------------------- | ----- |
| packages/finance-engine/src/uk-tax-year.property.test.ts                        | 2.7 s |
| packages/finance-engine/src/uk-what-if.property.test.ts                         | 0.5 s |
| packages/finance-engine/src/uk-take-home.test.ts                                | 0.4 s |
| packages/finance-engine/src/uk-tax.property.test.ts                             | 0.4 s |
| packages/finance-engine/src/ai-context-pack.test.ts                             | 0.3 s |
| packages/finance-engine/src/uk-tax-thresholds.test.ts                           | 0.2 s |
| packages/finance-engine/src/retirement.test.ts                                  | 0.2 s |
| packages/finance-engine/src/picture/selectors/housing-cost.property.test.ts     | 0.2 s |
| packages/finance-engine/src/picture/personas.test.ts                            | 0.2 s |
| packages/finance-engine/src/picture/selectors/marginal-rate.test.ts             | 0.2 s |
| packages/finance-engine/src/portfolio.property.test.ts                          | 0.2 s |
| packages/finance-engine/src/picture/selectors/portfolio-totals.property.test.ts | 0.2 s |
| packages/finance-engine/src/debt-payoff.test.ts                                 | 0.1 s |
| packages/finance-engine/src/test-vectors/uk-tax.vectors.test.ts                 | 0.1 s |
| packages/finance-engine/src/mortgage.test.ts                                    | 0.1 s |
| packages/finance-engine/src/joint-share.test.ts                                 | 0.1 s |
| packages/finance-engine/src/test-vectors/uk-self-assessment.vectors.test.ts     | 0.1 s |
| packages/finance-engine/src/uk-rule-sources.test.ts                             | 0.1 s |
| packages/finance-engine/src/test-vectors/uk-whatif.vectors.test.ts              | 0.1 s |
| packages/finance-engine/src/picture/selectors/estimated-tax-due.test.ts         | 0.1 s |

### packages/mcp

22 files, 639 tests (639 passed, 0 failed). Wall time 2.7 s.

Slowest 20 files:

| File                                                 | Time  |
| ---------------------------------------------------- | ----- |
| packages/mcp/src/policy/output-policy.test.ts        | 1.1 s |
| packages/mcp/src/transports/stdio.test.ts            | 0.8 s |
| packages/mcp/src/tools/simulate/simulate.test.ts     | 0.7 s |
| packages/mcp/src/**tests**/consistency.test.ts       | 0.7 s |
| packages/mcp/src/**tests**/surface.snapshot.test.ts  | 0.7 s |
| packages/mcp/src/auth/scopes.test.ts                 | 0.7 s |
| packages/mcp/src/**tests**/output-size.test.ts       | 0.7 s |
| packages/mcp/src/tools/read/query-tools.test.ts      | 0.5 s |
| packages/mcp/src/**tests**/anonymised-names.test.ts  | 0.5 s |
| packages/mcp/src/tools/assumptions.tool.test.ts      | 0.5 s |
| packages/mcp/src/tool-availability.test.ts           | 0.4 s |
| packages/mcp/src/audit.test.ts                       | 0.4 s |
| packages/mcp/src/define-tool.test.ts                 | 0.4 s |
| packages/mcp/src/tools/read/read-tools.test.ts       | 0.4 s |
| packages/mcp/src/tools/write/write-tools.test.ts     | 0.1 s |
| packages/mcp/src/transports/http.test.ts             | 0.1 s |
| packages/mcp/src/**tests**/prompt-injection.test.ts  | 0.1 s |
| packages/mcp/src/tools/read/retirement-tools.test.ts | 0.1 s |
| packages/mcp/src/evals/graders.test.ts               | 0.1 s |
| packages/mcp/src/auth/failed-auth-limiter.test.ts    | 0.0 s |

## CI shape after E41 P5 (measured 19 November 2026)

- Storybook a11y runs as two halves per theme, plus the light build smoke as its own leg. The jobs that keep the required names ("♿ Storybook a11y (light)" and "(dark)") pass only when every leg of their theme passed. `scripts/ci-config.test.ts` checks this wiring.
- Forced runs (no Turbo cache), three before and three after: the longest Storybook leg took 89 to 116 s, against 121 to 211 s for the single job.
- **Tried and dropped: Vitest web in two halves.** Each half ran the unit project with `--shard` and wrote a blob report, and a merge job applied the coverage floors to the merged coverage. Start of the first half to the end of the merge took 197 to 210 s (one queued run 291 s), against 196 to 251 s for the single job: no clear gain, because the merge job's own set-up costs back what the halves save. Floors set to 0 in a half and applied only at a merge step is a guard that could fail quietly, so the coordinator dropped it (20 November 2026). Web coverage floors stay enforced in the one job.
- Every needless rebase is a full CI run, about 5 to 8 runner-minutes and 3 to 5 minutes of wall time. The merge queue's rule (only the next pull request in the queue rebases) saves more than most of these slices.
