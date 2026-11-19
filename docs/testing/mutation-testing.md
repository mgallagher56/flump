# Mutation testing

Mutation testing makes one small fault at a time in the code (a `>` becomes `>=`, a `-` becomes `+`) and runs the tests. If no test fails, the fault "survived": the tests would not notice that mistake. The tool is [StrykerJS](https://stryker-mutator.io/). The plan is [E41](../audit/plans/E41-mutation-testing-and-test-speed-plan.md).

Status: slice M0, a proof on one module. Nothing here runs in CI, there is no score check, and no test was written to kill a survivor.

## Run it locally

```bash
bun run mutation
```

This runs Stryker in `packages/finance-engine` with [`stryker.config.json`](../../packages/finance-engine/stryker.config.json). Today it mutates `src/mortgage.ts` only.

- Reports: `packages/finance-engine/reports/mutation/mutation.html` (open it in a browser) and `mutation.json`. The folder is git-ignored.
- The run reuses earlier results from `reports/mutation/stryker-incremental.json`. Add `--force` for a full run: `bun run mutation --force`.
- To mutate something else for one run, pass `--mutate`, for example `bun run mutation --mutate "src/debt.ts"`, or a line range: `--mutate "src/mortgage.ts:32-44"`.
- The config uses `inPlace` (see below). Stryker writes the faults into the real source file and puts the original back at the end, from a backup in `packages/finance-engine/.stryker-tmp/`. Do not edit the mutated file while a run is going. If a run is killed, check `git status` and restore the file from that backup or from git.
- The script is not part of `turbo run test` or any CI job.

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

- No run in CI. The CI Node version is read from an image readme, not from a job.
- Web's single-project config and the sandbox in web or `packages/ui` were not run.
- The `tsconfig` package-name fix for the sandbox was not tried.
- What happens to the source file if a run is killed part way. Stryker keeps a backup, but recovery was not tested.
- Results from the unseeded property tests in `src/retirement.test.ts` and `src/uk-tax.property.test.ts` were not checked for run-to-run change.
- Whole-package figures (run time, fault count, incremental file size) for the engine. M1's first scheduled run measures these.

## Recommendation for M1

Go, with changes:

1. Keep `inPlace: true` and the explicit `plugins` list in every package's config, or first try the package-name `extends` fix to bring the sandbox back.
2. No TypeScript checker until the plugin supports TypeScript 7. Triage notes say when a survivor would not compile.
3. Pin Node 22 or later with `actions/setup-node` in the mutation workflow.
4. Measure the engine's full run before choosing the weekly schedule. The plan's estimate of 30 to 90 minutes is still an estimate.
5. Seed the property tests in `src/retirement.test.ts` and `src/uk-tax.property.test.ts` (M2) before trusting scores for the code they reach.
6. For web (M5), add a Stryker-only Vitest config with just the `unit` project.
