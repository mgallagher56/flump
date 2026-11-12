# Track F: Tests and coverage

Audited 2026-11-11 on `main`, read-only. Method: coverage numbers from `00-baseline.md` (not re-run), config reading, greps over all 188 test/spec files (about 650 `it`/`test` cases), and a read of 36 test files in detail (list in "Sample read" at the end). Skills used: `engineering:testing-strategy` method, plus the project `migrate-to-shoehorn` skill for the `as`-assertion count.

## Summary

The test suite is broad but shallow where it matters most.

- **The tests lock in the security and financial bugs rather than catching them.** `auth.guard.spec.ts` asserts that the mock token, an unsigned JWT and the "no WORKOS_API_KEY" fallback all authenticate. `orchestrator.test.ts` asserts that an overdrawn current account becomes a positive balance.
- **The coverage numbers overstate reality.** Four of the five Node packages have no `coverage.include`, so files that no test imports never enter the denominator. The web thresholds are written in a form Vitest 5 ignores.
- **Several layers do not exist:** authorization/IDOR tests, a guard-level integration test, MCP auth and anonymisation tests, route loader/action tests, E2E, and contract tests.
- **Storybook `play()` functions never run.** CI only runs `storybook build --test`, and no Vitest Storybook project is configured.
- **Lower-risk quality issues:** about 27 files with a single render-only or vacuous assertion, 25 snapshot files (4 orphaned), mocks of modules that do not exist, and tests that claim more than they assert.

Counts used below: 188 test files, 66 story files (32 with `play()`, 34 without), 123 `as` assertion lines in tests (99 are `as any`).

## Coverage by risk

Baseline numbers (statements / branches): finance-engine 75.8 / 64.8, banking 86.8 / 72.2, backend 89.3 / 72.8, mcp 25.7 / 11.9, ui 85.7 / 60.1, web 83.3 / 70.6, marketing 88.3 / 81.9, mobile and `@flump/common` no tests. Read these with finding F-05 in mind: they are upper bounds.

| Area                                                                                            | Risk                    | State                                                                                                                                              |
| ----------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `finance-engine` `tax-calculator.ts` (687 lines, self-assessment engine used by `TaxContainer`) | High                    | No test file in the package. Only reached indirectly from `TaxContainer.test.tsx`. Not in the package coverage denominator.                        |
| `finance-engine` `tax-rules.ts`, `uk-tax.ts`                                                    | High                    | No test mentions `2025/26` or `2026/27` data in `tax-rules.test.ts`. Current tax year is 2026/27. Most assertions are `toBeGreaterThan(0)`.        |
| `finance-engine` `mortgage.ts`, `forecast.ts`                                                   | High                    | Range or ordering assertions only. No edge cases (zero term, overpayment above balance, negative equity).                                          |
| `finance-engine` `debt-payoff.ts`                                                               | High                    | Best of the engine tests. Exact-value cases exist. Branch coverage still 80% in the (stale) report.                                                |
| `finance-engine` `section24.ts`                                                                 | High                    | Good exact-value tests. Joint ownership and payments on account are covered.                                                                       |
| `mcp` auth, anonymisation, tools, transports                                                    | High (privacy and auth) | One test file, 174 lines. Tools and resources are never invoked.                                                                                   |
| Backend `AuthGuard`                                                                             | High                    | Tests assert the bypasses. See F-01.                                                                                                               |
| Backend controllers and services                                                                | High                    | CRUD paths mocked. Ownership scoping (`where: {id, userId}`) not asserted. See F-04.                                                               |
| `banking` adapters                                                                              | Medium                  | Tests exercise the stubbed implementations, not real provider calls. See F-09.                                                                     |
| Backend providers (Monzo, Starling, Trading212, open-banking)                                   | Medium                  | Good: they mock `fetch` and assert request and response mapping.                                                                                   |
| Web route loaders/actions                                                                       | Medium                  | 22 route files export a loader or action. 5 route test files exist. `app/routes/*.*` is excluded from coverage, so the gap is invisible. See F-07. |
| `apps/mobile-companion` (9.5k lines)                                                            | Medium                  | No test runner, no tests. See F-12.                                                                                                                |
| `@flump/common`                                                                                 | Low                     | No tests. Confirm its contents before deciding whether it needs any.                                                                               |

## Findings

### [F-01] Auth guard tests assert the authentication bypasses

- Severity: P0
- Location: `apps/backend/src/auth/auth.guard.spec.ts:36-45` (mock token), `:47-76` (unsigned JWTs), `:78-89` (dev fallback); `apps/backend/src/auth/auth.guard.ts:25,33-49`
- Evidence: test names include "authenticates mock-session-token", "authenticates valid JWT token with sub and email" (the JWT is `header.<base64>.signature` with a literal fake signature), and "falls back to dev user when token is invalid and no WORKOS_API_KEY is configured". Each expects `canActivate` to return `true`. There is no test for a token with a wrong signature, an expired token, a missing `sub`, or a production-mode run with the mock token. The bypass path `/bank-connections/callback` is tested as "bypasses authentication" with no check of `state`.
- Impact: This is the same defect as the Phase 1 §0 list, seen from the test side. The suite certifies the hole as intended behaviour. When Track D's fix lands, three tests will fail and the natural reaction is to delete them. There is also nothing that proves a forged token is rejected.
- Recommendation: When fixing the guard, invert these tests: forged signature, tampered payload, expired `exp`, wrong audience, and `mock-session-token` all reject when `NODE_ENV=production` (or always). Add a test that an unset `WORKOS_API_KEY` throws at startup rather than authenticating. Add a test that the callback route validates `state`. Write the failing tests first.
- Effort: S

### [F-02] Test pins an overdrawn current account as a positive balance

- Severity: P1 (escalate to P0 if Track C confirms providers return signed balances for overdrawn accounts)
- Location: `packages/banking/src/server/orchestrator.test.ts:22-33`; implementation `packages/banking/src/server/orchestrator.ts:186-200`; caller `apps/backend/src/finance.service.ts:316`
- Evidence: the test asserts `normalizeAccountBalance("Current", -1500)` is `1500`. The implementation returns `Math.abs(rawBalance)` for every non-liability type, and `finance.service.ts:316` applies it to every synced provider account. No test in `finance.controller.spec.ts` syncs an overdrawn account.
- Impact: A bank-synced current account that is £1,500 overdrawn is stored as £1,500 in credit. Net worth, runway and debt views are overstated. Any fix will fail this test, so the test is also a barrier.
- Recommendation: Decide the intended rule (assets keep their sign, liabilities forced negative). Change the test to `-1500` for an overdrawn current account, fix the implementation, and add a sync test with an overdrawn provider account.
- Effort: S

### [F-03] `@flump/mcp` auth, scopes and anonymisation are essentially untested

- Severity: P1
- Location: `packages/mcp/src/mcp.test.ts:149-173`; `packages/mcp/src/auth/token-verifier.ts:80-91,100-146,148-188`; `packages/mcp/src/tools/financial-audit.tool.ts:251`; `packages/mcp/src/transports/http.ts`
- Evidence: the whole package has one test file. Its tool and resource test is `expect(server).toBeDefined()` after construction. Covered: the happy PAT path, one revoked PAT, the rate limiter, and the metadata shape. Not covered: expired PAT, unknown PAT hash, the no-store fallback that accepts any `flump_pat_` string as `cli_user` (`token-verifier.ts:121-127`), the `mock-session-token` / `mock_mcp_*` bypass (`:81`), the unsigned OAuth JWT path, audience check, scope parsing, `anonymizeInstitutions` behaviour in the 8 tools and 5 resources, scope enforcement per tool, and both transports. The baseline's 26% is likely generous (see F-05).
- Impact: This is the surface that sends financial data to third-party AI clients. The privacy promise on the marketing site ("Strict PII anonymisation") has no test behind it.
- Recommendation: Add (1) a verifier table test covering each accept and reject path, including the bypass tokens as expected failures once D fixes them; (2) per-tool tests that call the registered handler with a fake data provider and assert that institution names are absent when `anonymizeInstitutions` is true; (3) a scope test per tool; (4) an HTTP transport test that checks 401 and 429 handling. Target 80% lines on `src/auth` and `src/tools`.
- Effort: M

### [F-04] No authorization (IDOR) tests, no guard integration test, no validation tests

- Severity: P1
- Location: `apps/backend/src/budget.controller.spec.ts:96-141`; `apps/backend/src/tax.controller.spec.ts:84-115`; `apps/backend/src/finance.controller.spec.ts`; `apps/backend/src/finance.service.ts:83-89`
- Evidence:
  - Ownership is enforced by `findOne({ where: { id, userId } })` (for example `budget.controller.ts:318,342`). Tests replace `findOne` with `mockResolvedValueOnce(...)`, which ignores its argument. Deleting `userId` from the query would not fail a single test. Only 13 `toHaveBeenCalledWith` assertions across the backend mention a `userId`, and one `tax.controller.spec.ts:44` update assertion includes `{ id, userId }`.
  - Controllers are unit-tested by direct instantiation with `{ user: { id } }`. There is no `Test.createTestingModule` and no `supertest` anywhere in the backend. `@UseGuards(AuthGuard)` is applied per controller (6 places), so nothing proves a controller or route is guarded.
  - There is no `ValidationPipe` or `class-validator` in the backend. `createTransaction(userId, body: any)` spreads `...body` into the entity (`finance.service.ts:84-87`), so `id` and other fields can be mass-assigned. No test posts an unexpected field or a foreign `accountId`.
- Impact: The authorization model (the only protection once F-01 is fixed) has no regression net. A refactor could silently expose another user's budget, tax records or bank connections.
- Recommendation: (1) For every service/controller method that takes an id, assert the repository was called with `{ where: { id, userId } }` and that a different user gets `NotFoundException`. A shared helper `expectScopedToUser(repoMock, "user-1")` keeps this cheap. (2) Add one Nest integration spec with `supertest` and `Test.createTestingModule` that, for each controller, hits one route with no token and expects 401; a metadata test reading `__guards__` for every controller class is the cheaper alternative. (3) Add a two-user test on the real TypeORM layer (sqlite or a Postgres service container) for accounts, budget entries, tax records and bank connections. (4) Add validation and mass-assignment tests alongside whatever DTO validation Track D/C recommends.
- Effort: M

### [F-05] Coverage denominators exclude files no test imports; the web thresholds are not enforced

- Severity: P1
- Location: `packages/finance-engine/vitest.config.ts`, `packages/banking/vitest.config.ts`, `packages/mcp/vitest.config.ts` (absent), `apps/backend/vitest.config.ts`; `apps/web/vite.config.mts:70-92`; `.github/workflows/ci-pipeline.yml:80-88`
- Evidence:
  - None of the four configs sets `coverage.include`. With the v8 provider, Vitest 5 reports only files that were loaded during the run. `packages/finance-engine/src/tax-calculator.ts` (687 lines) has no test and is absent from the committed (stale) `coverage-final.json`. `apps/backend/src/mcp.service.ts` (264 lines, creates and validates PAT tokens) is only imported as a type by `mcp.controller.spec.ts`, so it is never loaded. `identity.adapter.ts`, `main.ts` and `app.module.ts` are in the same position. `packages/ui` is the only package that sets `include`.
  - The web config puts `branches: 80`, `functions: 80`, `lines: 80`, `statements: 80` directly under `coverage`. Vitest expects `coverage.thresholds`. Evidence it is not enforced: baseline web functions are 72.28 and branches 70.57, and `bun run test` passes. The same block sets `all: true`, which newer Vitest ignores.
  - The web config also excludes `app/routes/*.*`, `app/*.*` (`root.tsx`, `entry.*`, `session.server.ts` parts) and `app/components/ui/**` from coverage.
  - CI runs `bun run test` only. Only web produces coverage there, and the "Report Coverage" step is configured for `apps/web` alone.
- Impact: The 76% / 89% / 26% figures cannot be trusted as floors. The riskiest untested code is the code that is missing from the report. No package has a ratchet, so coverage can fall without a failing check.
- Recommendation: Set `coverage.include: ["src/**/*.ts"]` plus an explicit exclude list (`*.d.ts`, `index.ts`, `types.ts`, entities if wanted) in every package. Move web's numbers into `coverage.thresholds`. Remove the route exclusion or cover routes (F-07). Re-baseline, then set thresholds per the table at the end of this file. Run `test:coverage` in CI for all packages and publish one report.
- Effort: M

### [F-06] Finance-engine tests prove "something was computed", not "the right figure"

- Severity: P1
- Location: `packages/finance-engine/src/forecast.test.ts:5-66`; `mortgage.test.ts:13-18,52-72`; `tax-rules.test.ts:44-105`; `uk-tax.test.ts:73-77,168-171`; `uk-tax.ts:164-188,346`
- Evidence:
  - `forecast.test.ts` is titled "projects 30-year compound growth baseline accurately" but only asserts `> 80000` and that 30-year is greater than 10-year. The scenario test asserts `propertyEquityGbp > 0` only. `calculateCompoundTrajectory` asserts `endBalance > 70000`.
  - `mortgage.test.ts` computes the expected £1,389.58 in a comment and then asserts a range of 1380 to 1400. `calculateMortgageVsIsa` asserts only `> 0` on every field.
  - `tax-rules.test.ts` asserts `netAnnual > 0` and `ni > 0` for employed, self-employed and Irish take-home, and `> starterTax` for the Scottish higher band. Scottish tax at £50,000 has no exact expectation. `calculateScottishIncomeTax` in `uk-tax.test.ts:73-77` asserts `> 0`.
  - Coverage of the current tax year is absent: `tax-rules.test.ts` never references `2025/26` or `2026/27`, so the data the app uses today is untested. `buildLegacyUKConfig("1999/00")` is tested as silently falling back to 2024/25 numbers, which locks that behaviour in. `calculateUkTax` defaults `taxYear` to `"2025/26"` (`uk-tax.ts:346`) while the clock-based year is 2026/27; no test checks the two agree.
  - `calculateUkTax` inputs for Scotland, savings interest, bonus, BTL profit and Gift Aid have no test.
  - Two tests pin the ambiguity in `calculateTaxTrapRelief`: for £110k it returns `estimatedTaxSaved` 6200 (62%) while `estimatedTaxSavedByEscapingGbp` is 6000 (60%) on the same object (`uk-tax.ts:107-113`, test `uk-tax.test.ts:46-53`). `calculateEmployerNISavings` defaults to 13.8% and a £9,100 threshold for any tax-year string other than `2026/27` (`uk-tax.ts:177-182`), so 2025/26 uses the wrong rate while `tax-rules.ts:314` says 15%. The test pins only the 13.8% default.
- Impact: Money-calculation regressions of a few percent pass. The tax-year data for the current year can be wrong without a test failing.
- Recommendation: Replace ranges with exact expected values, hand-checked against HMRC examples (state the source in a comment). Add a table-driven test per tax year (2023/24 to 2026/27) for bands, personal allowance, NI and student-loan thresholds. Add property tests (fast-check) for monotonicity: more gross never means less net, tax never negative, net plus deductions equals gross. Add a test that every rate/threshold table has an entry for `getCurrentUKTaxYear()` using fake timers across 5 April / 6 April. Resolve the 60%/62% and 13.8%/15% ambiguities in Track C and pin the answer.
- Effort: M

### [F-07] Web route loaders and actions are largely untested and excluded from coverage

- Severity: P1
- Location: `apps/web/app/routes/` (22 route files export `loader` or `action`; `*.test.tsx` exist for `_index`, `$feature._index`, `app.onboarding`, `sandbox`, `tools`); `apps/web/app/session.server.ts`, `apps/web/app/root.tsx`; `apps/web/vite.config.mts:73-81`
- Evidence: no tests for `auth.callback.tsx` and `callback.tsx` (identical except the component name; they set the `flump_has_session` cookie), `logout._index.tsx`, `login._index.tsx`, `signUp._index.tsx`, `app.accounts._index.tsx` (2 exports), `app.accounts.$account.tsx` (2), `app.tax.tsx` (2), `app.savings.tsx` (2), `app.pension.tsx` (2), `app.budget.tsx`, `app.debt.tsx`, `app.mortgage.tsx`, `app.forecast.tsx`, `app.profile.tsx`. `backend-client.server.ts:71` falls back to `Bearer mock-session-token` when no access token is present, and `backend-client.server.test.ts` asserts neither the header nor the fallback. Route and entry files are excluded from coverage by pattern.
- Impact: The sign-in callback, logout, and every form action that writes to the backend run in production with no test. Redirect and cookie behaviour can regress unnoticed.
- Recommendation: Add loader/action tests that call the exports directly with `Request` objects and a mocked `backend-client`/WorkOS layer. Prioritise callback, logout, and the actions that mutate accounts, tax and savings. Assert: unauthenticated redirect, the `Authorization` header sent to the backend, the demo-mode loader never returns demo data for a signed-in user, and error paths. Remove `app/routes/*.*` from the coverage exclude.
- Effort: M

### [F-08] Storybook `play()` tests and the a11y addon never run; light/dark is visual only

- Severity: P1
- Location: `apps/web/package.json:90` (`test:storybook`); `apps/web/vite.config.mts` (no `storybookTest` project); `apps/web/.storybook/main.ts:19-21`; `apps/web/.storybook/preview.tsx:47-55`
- Evidence: `grep` for `storybookTest`, `test-runner` and `composeStories` finds nothing. `@storybook/addon-vitest` is installed and listed in `main.ts` but no Vitest project uses it. CI does not run `test:storybook` (and it is only a build). There are 66 story files; 32 have `play()`, 34 do not. Without `play()`: all 7 calculators in `packages/ui/src/calculators`, `packages/ui/src/components/forms/Button`, 10 of 12 marketing component stories, and 16 `apps/web/app/components` stories (FLP buttons, modal, input, select, tabs, text, header, nav, account details and dialogs). `preview.tsx` enables only `color-contrast` in the a11y config and sets no `a11y.test` mode, so violations are not failures. Light and dark are covered by a side-by-side decorator (two copies of each story in one DOM), which works for visual review but doubles element ids and gives axe a duplicated tree. No story has a dark-specific check.
- Impact: AGENTS.md Law 4.2 and 4.3 (stories with zero a11y violations, `play()` for interactive states) cannot be verified by any command. The plan's "33 of 54 without `play()`" is the same finding on a smaller denominator; the true repo-wide number is 34 of 66.
- Recommendation: Add the Vitest Storybook project (`storybookTest` plugin with the browser provider or happy-dom), set `parameters.a11y.test: "error"`, run it in CI as its own job, and give the 34 stories a `play()` (at least a rendered-state assertion; interaction for the calculators). Render light and dark as separate tests via a `globals.theme` parameter instead of one doubled DOM. Track J owns the actual violation count.
- Effort: M

### [F-09] Banking adapter tests exercise the stubs

- Severity: P2
- Location: `packages/banking/src/server/adapters/plaid.test.ts:21-60`; `plaid.ts:133-146`; `packages/banking/src/server/orchestrator.test.ts:41-60`; `packages/banking/src/server/crypto.test.ts`, `crypto.ts:8-15`
- Evidence: `PlaidAdapter.exchangePublicToken` builds `access-sandbox-<token>-<Date.now()>` and the test asserts accounts and transactions that the same file returns as canned data (2 accounts, `-42.5`, `2500`). That proves the fixture, not the Plaid mapping. `orchestrator.test.ts` tests `getMockInstitutionAccounts` and `generateMockHistory`, which are mock-data generators in the production class. `crypto.test.ts` never sets `BANKING_TOKEN_ENCRYPTION_KEY`, so it runs against `DEFAULT_DEV_KEY` and no test asserts the process fails (or warns) when the key is missing in production.
- Impact: Real Plaid and Open Banking behaviour (pagination, modified transactions, consent expiry, error mapping) has no test. If a real exchange is added, the current tests do not move.
- Recommendation: Split the sandbox/mock generators from the production adapter and test the mapping functions with recorded provider fixtures. Add a crypto test that production mode requires the key. Add contract tests against recorded Plaid and provider responses (nock or MSW).
- Effort: M

### [F-10] Vacuous, snapshot-only and orphaned tests

- Severity: P2
- Location: examples below; counts from greps over all test files
- Evidence:
  - About 27 test files contain fewer than 3 assertions. Examples: `packages/ui/src/calculators/TaxTrapCalculator/TaxTrapCalculator.test.tsx` ("renders without crashing", `expect(container).toBeDefined()`, which is always true); the other six calculator tests are the same; `packages/ui/src/primitives/Card/Card.test.tsx` and `StatusBadge/StatusBadge.test.tsx` (the latter is titled "with tabular numbers" and asserts text only); `apps/web/app/hooks/useIsMobile.test.ts` (one case, the false branch only); `apps/backend/src/app.controller.spec.ts` and the several `it("should be defined")` cases (for example `budget.controller.spec.ts:6`, `tax.controller.spec.ts:7`) which test that a class import exists.
  - 691 `toBeDefined()` / `toBeTruthy()` / `toBeInTheDocument()` assertions across the repo, many on `getByText(...)` results (which already throw when absent).
  - 25 `.snap` files, 21 test files use `toMatchSnapshot`. `FLPCard.test.tsx` is a single snapshot and still says "ChakraUI Card". Four snapshot files are orphaned (no matching test file): `apps/web/app/utils/__snapshots__/index.utils.test.tsx.snap`, `components/__snapshots__/ColorModeSwitch.test.tsx.snap`, `containers/accounts/__snapshots__/AccountsContainer.test.tsx.snap`, `containers/__snapshots__/TabsContainer.test.tsx.snap`.
  - 99 `vi.mock` calls; 8 web files mock 4 or more modules. `AccountsContainer.test.tsx:34-35` mocks `app/components/core/input/FLPInput` and `AccountsCard`; the first path does not exist (the component lives under `core/inputs/input/`), so that mock does nothing, and the replaced `AccountsCard` returns a plain string, which removes the card from the snapshot it is meant to cover. `app.onboarding.test.tsx` mocks the router, profile hook and baseline store, so it tests step navigation against stubs.
  - `useUserProfile` has two test files (`.test.ts` and `.test.tsx`) with overlapping cases.
  - Only 1 test file uses fake timers; 13 use `new Date()` or `Date.now()`. Tax-year logic (`getCurrentUKTaxYear`, 5/6 April rollover) is therefore clock-dependent in CI.
- Impact: High test count and statement coverage overstate protection. Snapshot churn gets approved without review.
- Recommendation: Delete the orphan snapshots. Replace render-only calculator tests with one numeric assertion each (a known input and its expected headline figure) plus one interaction. Convert snapshot tests to targeted assertions or inline snapshots on a small subtree. Fix or remove the mock for the missing path. Merge the two `useUserProfile` tests. Use `vi.useFakeTimers()` where dates matter.
- Effort: M

### [F-11] No E2E, contract or cross-package integration layer

- Severity: P1
- Location: repo-wide (no `playwright`, `cypress`, `supertest` or contract tooling in any `package.json` or workflow)
- Evidence: the sign-up, onboarding, connect-bank, budget journey is covered only by unit tests that mock the router, WorkOS and `fetch`. `apps/web` calls the backend via `backend-client.server.ts` and several hooks that return fallbacks on any error (`fetchJson` returns `fallback` on non-OK or throw), and the response shapes are duck-typed (`any`). Backend DTOs and the web types are separate declarations. There is no shared schema test.
- Impact: A backend field rename or a changed status code is hidden by the fallbacks and shows up as an empty page in production. The core journey can break with a fully green CI.
- Recommendation: Add one Playwright smoke suite against the docker-compose stack (web, backend, Postgres, WorkOS stubbed by a dev auth mode that is not the production bypass): sign in, finish onboarding, add an account manually, add a budget entry, see the dashboard totals. Add a contract layer: either shared zod schemas in `@flump/common` parsed on both sides, or an OpenAPI document generated from the backend and used to type and validate the web client. Run both in CI on `main` and on PRs touching `apps/backend` or `apps/web`.
- Effort: L

### [F-12] Mobile app has no test runner and mock behaviour in production code

- Severity: P2
- Location: `apps/mobile-companion/package.json` (no `test` script, no Jest/Vitest); `apps/mobile-companion/src/api/client.ts` (660 lines)
- Evidence: 9,490 lines under `src`, 0 tests. The API client falls back to an in-memory mock store when the backend is unreachable (Phase 1 §4). Seven screens each re-implement their own currency formatter.
- Impact: The only code in the monorepo with no safety net. Pure logic (formatters, client fallbacks) is cheap to test and is where a mock-versus-real mix-up would show.
- Recommendation: Add Vitest (or `jest-expo`) with a `test` script wired into turbo so it runs in CI. First tests: the API client with real and failing `fetch`, asserting that a failed request never presents mock data as real; then the shared formatter once extracted. Decide in Track G whether the mobile app ships at all before investing more.
- Effort: M

### [F-13] Duplicate tax calculator in the web UI has its own tests

- Severity: P2
- Location: `apps/web/app/components/forecast/UKTaxCalculator.tsx` (exports its own `calculateUKTax`), `UKTaxCalculator.test.tsx:25-62`; `packages/finance-engine/src/tax-calculator.ts:355` (a different `calculateUKTax`); `apps/mobile-companion/src/screens/{TaxScreen,ForecastScreen}.tsx` also reference `calculateUKTax`
- Evidence: two exports share the name `calculateUKTax` with different signatures and purposes (a salary take-home calculator in the web component, a self-assessment calculator in the engine). The web test hard-codes expectations (NI 2,414, income tax 6,036) computed in its comments rather than from the engine, and the employer NI case pins 15% on `2026/27`, while the engine's `calculateEmployerNISavings` default is 13.8% (F-06).
- Impact: Take-home figures can differ between the Tax page, the forecast calculator, the MCP tools and the onboarding summary, and no test compares them.
- Recommendation: Move the take-home logic into `finance-engine` (it already has `calculateUKEWNITakeHome` and `calculateUkTax`), delete the in-component copy, and add one cross-check test asserting all entry points agree for a few salaries and tax years. Track C owns the refactor.
- Effort: M

### [F-14] `as` assertions in tests: shoehorn migration is worthwhile but low priority

- Severity: P3
- Location: tests across `apps/backend` (7 files, 23 lines), `apps/web` (23 files, 74 lines), `apps/marketing` (1 file, 17 lines), `packages/ui` (3 files, 4 lines), `packages/finance-engine` (2 files, 5 lines)
- Evidence: 123 lines use `as X`; 99 are `as any`, 3 are `as unknown as`. 155 test lines contain `: any`, `as any` or `<any>`. The dominant patterns are `new Controller(mockRepo as any, mockProfileRepo as any)` in backend specs and `loader({ request, params: {}, context: {} } as any)` in web route tests. `@total-typescript/shoehorn` is not installed.
- Impact: Mock shapes are not checked against the real types. When a constructor or entity changes, tests keep compiling. It is a hygiene issue, not a risk driver.
- Recommendation: Worth doing, but after F-01 to F-07. Install `@total-typescript/shoehorn` in the root dev dependencies and migrate the backend repository mocks and web route args with `fromPartial` first (about 100 of the 123 lines). Leave the few legitimate `as const` and typed-literal casts. The migration is mechanical and best done as one PR per workspace.
- Effort: M

### [F-15] Coverage reports are committed and stale

- Severity: P2
- Location: `apps/*/coverage`, `packages/*/coverage` (158 tracked files); `apps/web/debug-storybook.log`, `apps/web/sonar-report.xml`
- Evidence: the committed `packages/finance-engine/coverage/coverage-final.json` lists paths under a worktree named `increase_vitest_coverage` and omits `tax-calculator.ts` and `ai-context-pack.ts`, so it cannot be used to answer "which files are uncovered". `git ls-files | grep -c coverage/` returns 158. `debug-storybook.log` and `sonar-report.xml` are ignored; the coverage folders are not.
- Impact: Misleading reports in the repo, dirty working trees after every `test:coverage`, and merge noise. Already raised in Phase 0 (§8) for Track N.
- Recommendation: Gitignore and remove all `coverage/` directories from the index. Publish coverage as a CI artefact or PR comment instead.
- Effort: S

### [F-16] Test setup is uneven across packages

- Severity: P3
- Location: `apps/backend/vitest.config.ts` (`globals: true`, `src/**/*.spec.ts`), `packages/banking/vitest.config.ts`, `packages/finance-engine/vitest.config.ts`, `packages/mcp/vitest.config.ts` (empty file), `apps/marketing/vitest.config.ts`
- Evidence: backend uses `.spec.ts`, packages use `.test.ts`. `packages/mcp/vitest.config.ts` is empty, so it relies on defaults (including `**/*.spec.*` and `dist`). Only `packages/ui` and `apps/web` define a coverage provider and include list. Backend specs import `Transaction` from `typeorm` without using it (`finance.controller.spec.ts:4`) and use `any` mock factories instead of shared helpers.
- Impact: Small. Makes it harder to apply one policy (thresholds, include lists, reporters) to every package.
- Recommendation: Add a shared `vitest.shared.ts` (coverage provider, include/exclude, reporters, thresholds) and extend it per package. Add a `test-utils` helper for typed repository mocks in the backend.
- Effort: S

## Recommended CI coverage thresholds

Do this after F-05 is fixed (set `include`) and a fresh baseline is taken. Start at floors equal to the new measured value minus 1 point, so CI turns on without breaking, then ratchet quarterly toward the target. Use `coverage.thresholds` with `perFile` only where noted.

| Package                 | Floor now (re-measure after F-05)                                                   | Target within 2 sprints                                                        | Per-file rules                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `@flump/finance-engine` | lines 75 / branches 65                                                              | lines 90 / branches 85                                                         | `tax-rules.ts`, `uk-tax.ts`, `tax-calculator.ts`, `section24.ts`, `mortgage.ts`, `debt-payoff.ts`, `forecast.ts`: lines 95 / branches 90 |
| `backend`               | lines 85 / branches 70                                                              | lines 90 / branches 80                                                         | `src/auth/**`: 100 lines, 95 branches; controllers and services: 90                                                                      |
| `@flump/banking`        | lines 85 / branches 70                                                              | lines 90 / branches 80                                                         | `crypto.ts`, `sign-enforcement.ts`: 100                                                                                                  |
| `@flump/mcp`            | lines 25 / branches 10 (set to the measured value)                                  | lines 70 / branches 60                                                         | `src/auth/**`: 95                                                                                                                        |
| `@repo/ui`              | lines 85 / branches 60                                                              | lines 88 / branches 70                                                         | calculators: 90                                                                                                                          |
| `@flump/web`            | lines 80 / functions 70 / branches 70 (move the existing numbers into `thresholds`) | lines 85 / functions 80 / branches 75, with routes included                    | `session.server.ts`, `backend-client.server.ts`, `routes/auth.callback.tsx`, `routes/callback.tsx`, `routes/logout._index.tsx`: 90       |
| `marketing`             | lines 85 / functions 60 / branches 80                                               | lines 85 / functions 75 / branches 80                                          | none                                                                                                                                     |
| `mobile-companion`      | none until tests exist                                                              | lines 50 on `src/api`                                                          | none                                                                                                                                     |
| Storybook               | none                                                                                | 100% of stories pass in the Vitest Storybook project with `a11y.test: "error"` | n/a                                                                                                                                      |

Also add a diff-coverage gate (for example 80% on changed lines) so new code in `finance-engine`, `auth` and `mcp` cannot land untested.

## Quick wins

1. Rewrite the three bypass tests in `auth.guard.spec.ts` as rejection tests together with the guard fix (F-01).
2. Change `orchestrator.test.ts:24` to expect `-1500` and fix `normalizeAccountBalance` (F-02).
3. Add `coverage.include: ["src/**/*.ts"]` to the four configs and re-run coverage once to see the true numbers (F-05).
4. Move the web `branches`/`functions`/`lines`/`statements` keys under `coverage.thresholds` (F-05).
5. Delete the four orphan `.snap` files and gitignore `coverage/` (F-10, F-15).
6. Add a metadata test that every controller class carries `AuthGuard` (F-04).
7. Replace the seven calculator "renders without crashing" tests with one exact-figure assertion each (F-10).
8. Fix the `vi.mock("app/components/core/input/FLPInput")` path or drop it in `AccountsContainer.test.tsx` (F-10).
9. Add the Storybook Vitest project to CI with `a11y.test: "error"` (F-08).
10. Add `fromPartial` from shoehorn to the backend repo mocks, one workspace at a time (F-14).

## Limits

- No runtime pass: tests and coverage were not re-run (instructed not to). Per-file coverage figures are from reading the config and the stale committed reports, which are from a different worktree and are not used for numbers except to show which files are missing from the report. F-05's claim that unloaded files are excluded rests on the Vitest config and on `tax-calculator.ts` and `mcp.service.ts` having no importing test; confirm it with one coverage run after adding `include`.
- Storybook: counts of `play()` and a11y configuration come from reading files. The actual a11y violation count and dark-mode rendering were not measured (Track J).
- Mobile: only file counts and the absence of a test script were checked; no code review of the screens.
- `@flump/common` contents were not reviewed.
- F-02 depends on what the real bank providers return for an overdrawn account; I read the normaliser and its single caller but not each provider's balance mapping.
- The 36 files read cover backend, finance-engine, banking, mcp, ui, web and marketing, but the remaining roughly 155 test files were only scanned by grep (assertion counts, snapshot usage, mock counts).

## Sample read (36 files)

Backend: `auth/auth.guard.spec.ts`, `budget.controller.spec.ts`, `tax.controller.spec.ts`, `finance.controller.spec.ts`, `mcp.controller.spec.ts`, `app.controller.spec.ts`, `providers/monzo.provider.spec.ts`.
Finance-engine: `tax-rules.test.ts`, `uk-tax.test.ts`, `forecast.test.ts`, `mortgage.test.ts`, `debt-payoff.test.ts`, `health-score.test.ts`, `section24.test.ts`, `persistence.test.ts` (head).
Banking and MCP: `plaid.test.ts`, `crypto.test.ts`, `orchestrator.test.ts`, `csv.test.ts`, `mcp.test.ts`.
UI: `TaxTrapCalculator.test.tsx`, `Card.test.tsx`, `StatusBadge.test.tsx`.
Web: `FLPCard.test.tsx`, `FLPBadge.test.tsx`, `UserLogin.test.tsx`, `useIsMobile.test.ts`, `useUserProfile.test.ts`, `AccountsContainer.test.tsx`, `TaxContainer.test.tsx`, `UKTaxCalculator.test.tsx`, `routes/_index.test.tsx`, `routes/app.onboarding.test.tsx`, `services/backend-client.server.test.ts`, `utils/utils.test.ts`.
Marketing: `McpPage.test.tsx`.

Positive notes: `section24.test.ts`, `csv.test.ts` and the backend provider specs assert exact figures and request/response mapping and are the model to copy; `debt-payoff.test.ts` is close behind.
