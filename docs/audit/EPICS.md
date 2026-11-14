# Epics and ticket drafts

Derived from [SUMMARY.md](SUMMARY.md). Items are the 64 verified P0 and P1 findings plus D-12 (P2, included because it needs a rotation); P2 and P3 items live in the track files (A to N). **No tickets have been created.** The tracker is GitHub (docs/agents/issue-tracker.md); labels follow docs/agents/triage-labels.md. Every draft starts as `needs-triage` unless noted, because the audit does not replace the maintainer's decision.

Epic grouping is the lead auditor's reading of the verified titles. Severity and effort come from the verified record. Acceptance criteria are the recommendation from each finding plus the shared rule at the end of this file.

## What is left (as of 2026-11-14)

This section was audited against `origin/main` at 7b9b6425. Every epic below carries a dated status line, and tickets that are not done carry their own marker. "Partly" means some of the work has merged; the epic's status line says what is missing.

### Engineering work not started or partly done, by launch importance

| # | Epic / ticket | Work | State |
|---|---|---|---|
| 1 | E19 | Account deletion including the WorkOS user, and JSON data export | Not started |
| 2 | E19 | Pages for the privacy policy, terms, cookie position and accessibility statement (text from owner and legal) | Not started |
| 3 | E11 F-11, E23 | E2E test of the new-user journey: sign up, onboarding, add account, budget entry | Partly |
| 4 | E20 | Enforce the full web CSP (report-only since #603) | Partly |
| 5 | E18 | A production environment separate from staging, so releases go to staging first | Not started |
| 6 | E23, E4 C-11 | Compute the real estimated tax due (now `null`); verify C-17 | Partly |
| 7 | E4 C-10 | A lone bonus record replaces the salary | Not started |
| 8 | E25 T5, T15, E4 B-07 | Rebuild `calculateUkTax` as an adapter; one-engine guard; move web calculators onto finance-engine | Partly |
| 9 | E22 | Stale-rates banner on savings, budget, onboarding and home | Partly |
| 10 | E24 | Fix stale paths in `docs/launch/readiness.json` | Not started |
| 11 | E8 | Make the Storybook a11y job blocking (due 2026-11-25) | Partly |
| 12 | E1 D-06, C-18, F-03 | Transactional deleteAccount; MCP auth coverage to 80% | Partly |
| 13 | E3 B-04, D-11, N-02 | Foreign keys and indexes; key id for bank tokens; zod env schema | Partly |
| 14 | E7 M-09, I-07 | Widen the claims guard; mirror the copy changes in web | Partly |
| 15 | E2, E1 G-03 | Salary-sacrifice defaults; delete the mock token and fake accounts in the parked mobile app | Partly |
| 16 | E15 | Pre-release visual pass | Not started |
| 17 | E9 H-03 | Last 17 design-token violations | Partly |
| 18 | E27, E28, E30 v2 | Pension projection epic; MTD decision (before April 2027); snapshot v2 | Not started |

### Work in progress

| Epic / ticket | Work | Where |
|---|---|---|
| E17 PR D | MCP write tools (staged entry) | Session, no PR yet |
| E17 PR E | Web review of staged imports | Session, no PR yet |
| E15 phase 8 | Visual regression guard | #651 |
| Follow-ups | Follow-up sweep | #647 |

### Owner actions

| Epic | Action |
|---|---|
| E4, E22, E25 | Sign off the tax vectors (294 unsigned); verify the 2027/28 figures |
| E18 | Run and log the backup restore drill; set the Sentry DSN and uptime monitors; create a production environment |
| E3 D-12 | Rotate the WorkOS key from git history |
| E19, E29b | ICO fee; legal text; data region move; FCA perimeter view from the solicitor |
| E29a, E17 PR F | Sign the advice-boundary policy and the MCP DPIA; send the Innovation Hub enquiry |
| E24 | Custom domain and email; real company details and mailboxes; launch attestations |
| E30 PR3 | Choose the email provider and get a PECR opinion for reminders |
| E15, E16 | Approve screens in light and dark; attest that the E16 cuts are removed |

## Order

E1 blocks E2, E5 and E6 (do not build on an unauthenticated backend). E3, E4 and E7 are independent and can run alongside E1. E9 and E12 wait on decisions. E10, E13 and E14 have no P0/P1 items; their backlog is the P2/P3 lists in tracks A, E, K and L. E12 (mobile companion) has no P1 of its own besides B-07: decide whether to finish it or park it, then plan from Track G and Track J.

## E1. Real authentication and authorisation, fail closed

- **Status (2026-11-14, checked against `origin/main`):** partly. The fail-closed core merged in #369: JWKS verification, the dev bypass gated off production, the MCP verifier rejecting OAuth JWTs, and web redirecting to /login. D-01, D-02, D-04, B-01, D-03, F-01 and D-07 are done. Request validation (D-08, B-02) landed later through E21's global zod contract interceptor (#634). Still open: deleteAccount is not transactional (D-06, C-18); MCP auth coverage is below the 80% target (F-03); the parked mobile companion still hardcodes `mock-session-token` and fake accounts (G-03).
- **Severity:** P0
- **Blocked by:** none
- **Done when:** Backend, MCP and web reject unauthenticated or forged identities in every environment; no mock token or fallback user exists in production code; one user can never read or write another user's data.
- **Notes:** Write failing tests first (replace the specs that assert the bypass), then fix. Do D-02 and D-01 before anything else; D-06 is a one-line reorder. The auth model (verify WorkOS access tokens via JWKS, session handling between web and backend) needs a decision first, so start with a `grill-with-docs` session.
- **Labels:** ready-for-agent for S/M items once the auth model is decided

### Tickets

#### D-01: Backend accepts unsigned JWTs and trusts sub claim

- Severity P0, effort M, location `apps/backend/src/auth/auth.guard.ts:30-43`
- Acceptance: Verify WorkOS access tokens via JWKS (jose createRemoteJWKSet) with iss and exp checks, reject on failure, update tests to signed fixtures.
- Blocked by: none

#### D-02: mock-session-token and missing WORKOS_API_KEY disable authentication

- Severity P0, effort S, location `apps/backend/src/auth/auth.guard.ts:25-29,46-50`
- Acceptance: Remove the literal; gate any dev bypass on explicit flag refused in production; validate required env at boot and fail closed.
- Blocked by: none

#### D-04: Web app fails open to shared mock session and sends mock-session-token

- Severity P0, effort M, location `apps/web/app/utils/utils.ts:97-104; root.tsx:35; app.tax.tsx:16; app.pension.tsx:21; app.profile.tsx:16; Budge`
- Acceptance: Rethrow or redirect to /login unless explicit non-production dev flag; remove all mock-token fallbacks; centralise API calls.
- Blocked by: none

#### G-03: Mock and dev sessions live in production paths and can attach real users to shared mock identities

- **Status (2026-11-14):** PARTLY. Done for web, backend and MCP (#369, flag-gated). `apps/mobile-companion/src/api/client.ts:21` still hardcodes `mock-session-token` and keeps an in-memory fake-account fallback. That app is parked for the E12 rebuild, but the code is still in the repo.
- Severity P0, effort M, location `apps/web/app/utils/utils.ts:99-104; apps/backend/src/auth/auth.guard.ts:25-27,46-49; ~28 web sites using acces`
- Acceptance: Fail closed in web, gate backend and MCP mock identities behind an explicit dev flag or remove them.
- Blocked by: none

#### B-01: Authentication fails open at every layer of the web-to-backend path

- Severity P0, effort M, location `apps/web/app/utils/utils.ts:99-104; apps/web/app/services/backend-client.server.ts:71; apps/web/app/routes/app`
- Acceptance: One AuthContext module per side. Web fails closed. Backend verifies the JWT against JWKS. Gate any dev identity on NODE_ENV plus an explicit flag. Remove the mock-session-token fallbacks.
- Blocked by: none

#### D-03: MCP verifier: mock tokens, unsigned OAuth JWTs, optional aud/exp, scopes self-assignable

- Severity P0, effort M, location `packages/mcp/src/auth/token-verifier.ts:81-89,135-185; apps/backend/src/mcp.controller.ts:32-40`
- Acceptance: Share one JWKS-based verifier with the backend guard, require aud and exp, delete or flag-gate mock branch, drop hardcoded second audience.
- Blocked by: none

#### F-01: Auth guard tests assert the authentication bypasses

- Severity P0, effort S, location `apps/backend/src/auth/auth.guard.spec.ts:36-89; apps/backend/src/auth/auth.guard.ts:25,33-49`
- Acceptance: Invert these into rejection tests alongside the guard fix (bad signature, tampered payload, expired, wrong audience, mock token in production, unset WORKOS_API_KEY fails at startup, callback validates state). Write failing tests first.
- Blocked by: none

#### F-03: @flump/mcp auth, scopes and anonymisation are essentially untested

- **Status (2026-11-14):** PARTLY. Tests exist for the verifier, scopes, http, stdio and tools. The coverage threshold is 75% of lines globally (`packages/mcp/vitest.config`), not 80% on auth and tools.
- Severity P1, effort M, location `packages/mcp/src/mcp.test.ts:149-173; packages/mcp/src/auth/token-verifier.ts:80-188; packages/mcp/src/tools/f`
- Acceptance: Verifier table test for each accept/reject path, per-tool anonymisation tests with a fake data provider, scope tests, HTTP transport 401/429 tests. Target 80% lines on src/auth and src/tools.
- Blocked by: none

#### D-06: deleteAccount deletes transactions before ownership check

- **Status (2026-11-14):** PARTLY. Ownership is now checked first (`finance.service.ts:91-95`), but the deletes still do not run in one database transaction; the E1 ledger deferred that.
- Severity P1, effort S, location `apps/backend/src/finance.service.ts:67-70`
- Acceptance: Check ownership first or include userId in the delete, do it transactionally, add two-user regression test.
- Blocked by: none

#### D-07: Raw request bodies spread into save(): id/userId takeover and cross-user writes

- Severity P1, effort M, location `apps/backend/src/account-intake.service.ts:230-248; finance.service.ts:83-89; tax.controller.ts:741-795`
- Acceptance: DTOs with whitelisted fields, never spread bodies, strip id/userId/timestamps, verify accountId ownership.
- Blocked by: none

#### D-08: No server-side input validation; handlers take body: any

- **Status (2026-11-14):** DONE via E21 (#634). `ContractShadowInterceptor` (`apps/backend/src/contract/`) validates every manifest route with zod in `enforce` mode. Four `body: any` annotations remain, as types only (`tax.controller.ts:274,289`, `user-profile.service.ts:100,325`).
- Severity P1, effort L, location `apps/backend/src/main.ts:8-12; tax.controller.ts:774,786; user-profile.controller.ts:66; mcp.controller.ts:33-`
- Acceptance: Add class-validator or zod pipe, global ValidationPipe with whitelist and forbidNonWhitelisted, convert interfaces to validated classes.
- Blocked by: none

#### B-02: No backend validation/DTO layer; PATCH handlers mass-assign request bodies

- **Status (2026-11-14):** DONE via E21 (#634) and field allow-lists (`pickTaxRecordFields`, `user-profile.service.ts:346`). There are no class-validator DTOs; the zod contract does that job.
- Severity P1, effort L, location `apps/backend/src/tax.controller.ts:774,785,794; account-intake.service.ts:246; main.ts; package.json`
- Acceptance: Add zod or class-validator DTOs per route, a global ValidationPipe with whitelist and forbidNonWhitelisted, and explicit field allow-lists on update.
- Blocked by: none

#### C-18: deleteAccount ordering, upsert-by-id and no validation (see Track D)

- **Status (2026-11-14):** PARTLY. Ordering and validation are done (see D-06 and D-08); the transaction is still outstanding.
- Severity P1, effort M, location `apps/backend/src/finance.service.ts:67-70; tax.controller.ts:774-790; account-intake.service.ts:230-248`
- Acceptance: Ownership check first inside a DB transaction; DTOs with whitelist ValidationPipe; strip id/userId.
- Blocked by: none

## E2. Remove mocks and fabricated data from product paths

- **Status (2026-11-14, checked against `origin/main`):** done. Backend seeding was removed in #377, with the `RemoveSeededExampleData1794355400000` migration cleaning existing rows, and web fabrications were removed in #384. Every ticket below is done. Small leftovers:
  - `isSalarySacrifice ?? true` defaults in `TakeHomeCalculator.tsx:60` and `PensionContainer.tsx:164`.
  - `updateProfile` find-or-create still seeds pension 5%/3% with salary sacrifice on (`user-profile.service.ts:326-345`).
  - The parked mobile app still carries fake accounts (see E1 G-03).
- **Severity:** P0
- **Blocked by:** E1
- **Done when:** No GET or loader creates data; no screen shows invented figures; demo data is reachable only through an explicit, labelled demo mode that can never be entered by a signed-in user.
- **Notes:** Needs a policy decision on demo mode and seed data first.
- **Labels:** ready-for-agent after the demo-mode decision

### Tickets

#### G-01: New real users seeded with fake accounts, fake pension and the developer's personal rental ledger

- Severity P0, effort M, location `apps/backend/src/account-intake.service.ts:93-136; apps/backend/src/tax.controller.ts:40-720; apps/backend/src`
- Acceptance: Remove seeders from read endpoints, seed only in dev scripts, migrate existing seeded users, review repo history for real personal data.
- Blocked by: E1

#### C-04: New users seeded with fabricated accounts, duplicated by a race

- Severity P1, effort S, location `apps/backend/src/account-intake.service.ts:93-135; apps/web/app/services/backend-client.server.ts:91-100`
- Acceptance: Remove production seeding or make it an explicit demo action; otherwise seed once under a constraint.
- Blocked by: E1

#### C-05: Tax records seeded with developer rental and ISA data, recurring forever

- Severity P1, effort S, location `apps/backend/src/tax.controller.ts:29-70`
- Acceptance: Delete the seed and clean existing rows.
- Blocked by: E1

#### B-03: Tax controller seeds a real-looking personal rental P&L into every new user on a GET

- Severity P1, effort M, location `apps/backend/src/tax.controller.ts:29-728; account-intake.service.ts:93-134; budget.controller.ts:34,197-227`
- Acceptance: Opt-in DemoSeedService, never from a GET, fixtures in a separate file. Real users get empty states.
- Blocked by: E1

#### I-01: Debt page invents four debts and hard-coded inputs for users without debt data

- Severity P1, effort M, location `apps/web/app/containers/debt/DebtContainer.tsx:31-65,102,105-108,117-125,147-153`
- Acceptance: Replace the fallback with an empty state and an optional, clearly labelled example toggle. Feed real savings and expenses from the loader. Persist debt changes through the accounts action and confirm deletes.
- Blocked by: E1

#### I-02: Dashboard Debt widget and loader fabricate figures

- Severity P1, effort M, location `apps/web/app/components/dashboard/widgets/DebtWidget.tsx:64-67; apps/web/app/routes/_index.tsx:236-243; apps/w`
- Acceptance: Compute from real liability accounts via the finance engine, or hide the stat boxes when data is missing. Remove the || fallbacks.
- Blocked by: E1

#### I-03: Budget MTD Settled Actuals is always 92% or 78% of budget

- Severity P1, effort M, location `apps/web/app/components/budget/BudgetDashboard.tsx:208-214,498-501,587-590; apps/web/app/types/budget.ts:16`
- Acceptance: Hide the Actuals column and prompt to connect a bank or log spend until real data exists, then populate from synced transactions. Effort is S to hide, L to build.
- Blocked by: E1

## E3. Secrets, config and database safety

- **Status (2026-11-14, checked against `origin/main`):** mostly done (#373; gitleaks in CI #462).
  - Done: D-10, N-01, C-19 and A-01. Synchronize is off, migrations run, and production rejects default passwords and verifies TLS (`config/db.config.ts`).
  - Partly: B-04, D-11 and N-02.
  - Owner action: rotating D-12.
- **Severity:** P1
- **Blocked by:** none
- **Done when:** Production refuses to boot with missing or insecure config; schema changes go through migrations; secrets found in git history are rotated.
- **Notes:** D-12 is a rotation task for a human, not code. Treat D-10, N-01, C-19 and A-01 as one ticket.
- **Labels:** ready-for-human for D-12; ready-for-agent for the rest

### Tickets

#### D-10: TypeORM synchronize:true everywhere, TLS verification off, default DB credentials

- Severity P1, effort M, location `apps/backend/src/app.module.ts:54-55,75,60-64`
- Acceptance: synchronize false outside dev with migrations; verify certs with CA; no default password in production.
- Blocked by: none

#### N-01: TypeORM synchronize:true unconditional; DB TLS verification disabled

- Severity P1, effort M, location `apps/backend/src/app.module.ts:54,55,75`
- Acceptance: Guard synchronize by NODE_ENV now; introduce TypeORM migrations; verify TLS or use the private network.
- Blocked by: none

#### C-19: synchronize: true against production Postgres

- Severity P1, effort M, location `apps/backend/src/app.module.ts:54,75`
- Acceptance: Migrations; disable synchronize outside local development.
- Blocked by: none

#### A-01: TypeORM synchronize:true on every connection, no migrations

- Severity P1, effort M, location `apps/backend/src/app.module.ts:54,75`
- Acceptance: Gate synchronize on a non-production flag. Generate a baseline migration from the current entities and run migrations as a release step.
- Blocked by: none

#### B-04: Schema managed by synchronize:true with no migrations, indexes or foreign keys

- **Status (2026-11-14):** PARTLY. Migrations exist and synchronize comes from config, but the baseline migration has almost no foreign keys, indexes or cascades; only later migrations add a few.
- Severity P1, effort L, location `apps/backend/src/app.module.ts:54,55,75; apps/backend/src/entities/*.ts`
- Acceptance: synchronize from config (false by default), baseline migration plus reviewed migrations, indexes and FKs with cascade, autoLoadEntities, verify the DB certificate.
- Blocked by: none

#### D-11: Bank token encryption falls back to committed default key; ciphertext returned to clients

- **Status (2026-11-14):** PARTLY. Strict mode and decrypt fail closed (`packages/banking/src/server/crypto.ts`), and clients get a public DTO. Still missing: a key id, and a requirement for 32 random bytes (only a minimum length is checked). `DEFAULT_DEV_KEY` remains for dev and test.
- Severity P1, effort M, location `packages/banking/src/server/crypto.ts:7,13,90-99; apps/backend/src/finance.service.ts:91-96,141,263`
- Acceptance: Throw at boot if key unset in production, require 32 random bytes, return a response DTO without tokens, make decrypt failures throw, add key id.
- Blocked by: none

#### N-02: No boot-time env validation; insecure fallbacks for missing variables

- **Status (2026-11-14):** PARTLY. Boot validation exists for the database, the banking key and auth (`config/config.module.ts:15-19`), but as hand-written resolvers, not a zod schema per app.
- Severity P1, effort M, location `apps/backend/src/app.module.ts:31,63; packages/banking/src/server/crypto.ts:7,13; apps/backend/src/auth/auth.g`
- Acceptance: Per-app zod env schema parsed at boot; no defaults for secrets in production; remove or test-gate DEFAULT_DEV_KEY.
- Blocked by: none

#### D-12: Real-looking WorkOS API key committed to git history

- **Status (2026-11-14):** OWNER ACTION. Gitleaks runs in CI (`.github/workflows/security-scan.yml`, #462). The rotation cannot be verified from code (E18 O-14).
- Severity P2, effort S, location `git commits ba5e978 and 5d17dc9, apps/backend/.env`
- Acceptance: Rotate the key and client secret, review WorkOS audit logs, consider history rewrite, add gitleaks to CI.
- Blocked by: none

## E4. Tax and money correctness

- **Status (2026-11-14, checked against `origin/main`):** mostly done.
  - The engine track merged as #379, despite its DRAFT title: C-01, C-02, C-03, C-06, C-07, C-08, C-13, C-14 and F-06.
  - C-15 and F-02 merged in #583.
  - Still open: C-10 is not started, C-11 only hides the figure, and the B-07 web calculators still have their own formulas.
  - Owner action: all 294 vectors are unsigned (`signedOffBy` is null), so every figure stays unverified.
- **Severity:** P0
- **Blocked by:** none
- **Done when:** Tax, NI, student-loan and Scottish figures match the published rules for each supported tax year, backed by test vectors written before the fix; no money arithmetic produces impossible results.
- **Notes:** Introduce one canonical tax-year API in finance-engine first (C-06 and C-08 are symptoms of its absence), then fix each table. Have a person with UK tax knowledge sign off the vectors.
- **Labels:** needs-triage; split per item once the tax-year API is agreed

### Tickets

#### C-02: tax-rules.ts and tax-calculator.ts start 45% at taxable 112,570, not 125,140

- Severity P0, effort M, location `packages/finance-engine/src/tax-rules.ts:1003-1013; tax-calculator.ts:634-686`
- Acceptance: Shared band function (see C-01).
- Blocked by: none

#### C-03: Gift Aid double counted in calculateUkTax

- Severity P0, effort S, location `packages/finance-engine/src/uk-tax.ts:356-392`
- Acceptance: Use the reduced figure only for the allowance taper; tax unreduced income against extended bands.
- Blocked by: none

#### C-01: EWNI income tax in uk-tax.ts wrong above 100k (understated up to ~5k)

- Severity P1, effort M, location `packages/finance-engine/src/uk-tax.ts:190-227`
- Acceptance: One band function on taxable income after allowance (basic 37,700, higher to 125,140, additional above), driven by the per-year table. Add vectors at 100k/110k/125,140/150k.
- Blocked by: none

#### C-06: Scottish tax in uk-tax.ts uses 2024/25 bands and mixed bases

- Severity P1, effort S, location `packages/finance-engine/src/uk-tax.ts:232-282`
- Acceptance: Use UK_SCOTLAND_INCOME_TAX[taxYear] with calculateScottishIncomeTaxOnTaxable.
- Blocked by: none

#### C-07: Employer NI savings use 13.8%/9,100 for 2025/26

- Severity P1, effort S, location `packages/finance-engine/src/uk-tax.ts:164-185`
- Acceptance: Read UK_EMPLOYER_NI_RATES[taxYear].
- Blocked by: none

#### C-08: Three diverging student loan tables

- Severity P1, effort S, location `uk-tax.ts:29-44; tax-rules.ts:99-108; debt-payoff.ts:628-642`
- Acceptance: Single UK_STUDENT_LOANS[taxYear] table, used everywhere.
- Blocked by: none

#### C-10: A lone bonus record replaces the whole salary

- **Status (2026-11-14):** NOT STARTED. `tax-calculator.ts:497-525` still lets any `paye_bonus` record replace the profile salary, and decision D3 is unresolved.
- Severity P1, effort S, location `packages/finance-engine/src/tax-calculator.ts:463-465`
- Acceptance: Add logged income to the profile salary or require an explicit mode.
- Blocked by: none

#### C-11: Dashboard estimated tax due is a flat 29% of all records

- **Status (2026-11-14):** PARTLY. The flat 29% is gone (#391), but `apps/web/app/routes/_index.tsx:157` sets `estimatedTaxDue = null` instead of calling the engine. The real figure moved to E23.
- Severity P1, effort S, location `apps/web/app/routes/_index.tsx:138-146`
- Acceptance: Call calculateUKTax for the current tax year.
- Blocked by: none

#### C-13: Unpayable debt gives a 30-year payoff date; interest saved estimate far off

- Severity P1, effort M, location `packages/finance-engine/src/debt-payoff.ts:259-262,388-402`
- Acceptance: Return payoffAchievable false when balance grows or the cap is hit; simulate the minimum-only baseline.
- Blocked by: none

#### C-14: Forecast double spends debt payments; scenario deficits vanish

- Severity P1, effort M, location `packages/finance-engine/src/forecast.ts:73-87,116,164-167`
- Acceptance: Deduct debt payments from savings; apply deficits to cash, ISA, then debt; index by years.
- Blocked by: none

#### C-15: Overdrawn accounts treated as positive assets

- Severity P1, effort S, location `packages/finance-engine/src/portfolio.ts:158-159; packages/banking/src/server/orchestrator.ts:186-200; package`
- Acceptance: Do not abs asset balances; allow negatives or reclassify as debt.
- Blocked by: none

#### F-02: Test pins an overdrawn current account as a positive balance

- Severity P1, effort S, location `packages/banking/src/server/orchestrator.test.ts:22-33; packages/banking/src/server/orchestrator.ts:186-200; a`
- Acceptance: Decide the sign rule, change the test to -1500, fix the implementation, add a sync test with an overdrawn provider account.
- Blocked by: none

#### F-06: Finance-engine tests prove a value was computed, not that it is right

- **Status (2026-11-14):** DONE for the tests (#379: table, sweep and property tests; the 60%/62% question settled as D7-a). The vectors still wait on the owner's sign-off.
- Severity P1, effort M, location `packages/finance-engine/src/forecast.test.ts:5-66; mortgage.test.ts:13-18,52-72; tax-rules.test.ts:44-105; uk-`
- Acceptance: Exact hand-checked expectations with sources, table-driven per-tax-year tests (2023/24-2026/27), property tests for monotonicity and net+deductions=gross, a fake-timer test that every table has an entry for getCurrentUKTaxYear() around 5/6 April, and resolve the 60/62% and 13.8/15% ambiguities.
- Blocked by: none

#### B-07: Financial calculations re-implemented in mobile and web instead of using finance-engine

- **Status (2026-11-14):** The mobile part is CANCELLED (DECISIONS.md, E12 rebuild); the old screens still compute locally until they are deleted. The web part is NOT STARTED:
  - Hand-written formulas remain in `OverpaymentSimulator.tsx:96`, `RemortgageShockSim.tsx:148`, `OverpayVsSaveCompare.tsx:125` and `SavingsWidget/futureValue.ts:35`.
  - There is no finance-math guard (see E25 T15).
- Severity P1, effort M, location `apps/mobile-companion/src/screens/{ForecastScreen.tsx:11-60,ProfileScreen.tsx:90-140,MortgageScreen.tsx:111-19`
- Acceptance: Delete the local copies and call the engine. Add an overpayment-comparison function and Irish take-home to the engine. Add a CI grep guard for hand-written amortisation formulas in apps.
- Blocked by: none

## E5. Honest failure states and one API client

- **Status (2026-11-14, checked against `origin/main`):** done. Loaders use `backendFetch` and `BackendError` and report failures honestly (commit 7221bab0; related #563, #569, #578). `single-api-client.guard.test.ts` enforces one client. C-20, B-06 and I-04 are done; I-06 is partly done.
- **Severity:** P1
- **Blocked by:** E1
- **Done when:** A backend outage shows an error state, never an empty account; one validated API base URL and client replace the 21 repeated fallbacks; destructive actions confirm consistently.
- **Notes:** Introduce a single env-validated config value, then change loaders to throw to error boundaries.
- **Labels:** ready-for-agent

### Tickets

#### C-20: Web loader turns backend errors into an empty workspace

- Severity P1, effort M, location `apps/web/app/services/backend-client.server.ts:73-81`
- Acceptance: Distinguish failure from empty; show an error state.
- Blocked by: E1

#### B-06: Web swallows backend failures as empty data and repeats the API base URL in 21 places

- Severity P1, effort M, location `apps/web/app/services/backend-client.server.ts:73-80; localhost:4000 fallback in 14 files (root.tsx, 8 routes,`
- Acceptance: One zod-validated config.server.ts and one typed backendClient that throws BackendError. Loaders reach the ErrorBoundary. Client mutations go through route actions.
- Blocked by: E1

#### I-04: Loaders swallow every error, so an outage looks like an empty account

- Severity P1, effort M, location `apps/web/app/routes (loaders), app._index.tsx:25`
- Acceptance: Return an error state from loaders and render a retry banner. Do not redirect on profile fetch failure.
- Blocked by: E1

#### I-06: Destructive actions without confirmation, and three different confirmation styles

- **Status (2026-11-14):** PARTLY. `ConfirmDialog` was promoted to `@repo/ui` (#585) and is used in 18 web files. UNVERIFIED for the remove-account action in the add/edit accounts flow. Mobile is dropped (E12 rebuild).
- Severity P1, effort M, location `AccountDetails.tsx onRemoveYear; AddEditAccountsDialog.tsx handleRemoveAccount; mobile Disconnect All`
- Acceptance: Single shared ConfirmDialog with consequence text and undo where possible.
- Blocked by: E1

## E6. Unfinished integrations: finish, flag or delete

- **Status (2026-11-14):** closed (findings moved; see Housekeeping under E24). G-04 is done by E16 PR7, G-06 moved to E17, and I-08 moved to E16 T-CUT-5 and T-DEMOTE-4. Nothing is open under E6 itself.
- **Severity:** P1
- **Blocked by:** E1
- **Done when:** Every button either works, is hidden behind a flag, or is removed; connect-bank no longer asks users for developer tokens.
- **Notes:** Needs a scope decision per integration (the Track G table shows the state of each provider). Candidate for the `wayfinder` skill.
- **Labels:** needs-triage

### Tickets

#### G-04: Account history editing on web and mobile calls non-existent endpoints

- Severity P1, effort M, location `apps/web/app/routes/app.accounts.$account.tsx:16-55; AccountDetailContainer.tsx:95-130; apps/mobile-companion/`
- Acceptance: Implement the endpoints with ownership checks or remove the UI; add a web-to-Nest route contract test.
- Blocked by: E1

#### G-06: MCP AI-connections card is a client-side fake

- Severity P1, effort M, location `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx:126-136,165-190; apps/`
- Acceptance: Wire callbacks to /mcp-tokens and context-pack, remove mock fallbacks, publish package or change snippet; hide card until then.
- Blocked by: E1

#### I-08: Connect-bank flow asks for developer tokens, and the OAuth path looks non-functional

- **Status (2026-11-14):** MOVED to E16. `ConnectBankWizard.tsx:87` still offers a "paste your own access token" preview, and bank connect is owner-only (#414).
- Severity P1, effort L, location `apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx`
- Acceptance: Hide token paths behind a developer flag, add a connect step to onboarding, verify the OAuth return handler.
- Blocked by: E1

## E7. Marketing and security claims vs reality

- **Status (2026-11-14, checked against `origin/main`):** mostly done (commits 6278f571, 32f9d2f5 and 16ae682f; guard test `apps/marketing/src/claims.test.ts`). M-07, M-08, M-10, G-08 and G-12 are done; M-06, M-09 and I-07 are partly done. Later work built on it: E24 T4 pricing (#601), E31 (#624) and E17 (#637).
- **Severity:** P1
- **Blocked by:** none
- **Done when:** No page promises a feature, certification, regulatory status or security property the product does not have today.
- **Notes:** Mostly copy edits and removed sections, all effort S. Do these early: the exposure is legal as much as technical. Have the claims reviewed by someone qualified before restoring any of them.
- **Labels:** ready-for-human (copy and legal judgement)

### Tickets

#### M-06: 'One-click permanent erasure ... purges all historical data' has no backing endpoint

- **Status (2026-11-14):** PARTLY. The erasure claims are removed. There is still no published privacy policy and no account deletion endpoint (both E19).
- Severity P1, effort S, location `apps/marketing/src/pages/SecurityPage.tsx:235-240,402; apps/marketing/src/components/Footer.tsx:136; apps/back`
- Acceptance: Reword to what exists or build account deletion and export; add a real privacy policy page with controller details.
- Blocked by: none

#### M-07: FCA AISP and regulated bank-sync claims describe a live sync that does not exist; no FCA registration stated

- Severity P1, effort S, location `SecurityPage.tsx:85-88,157-162,305; HomeFAQ.tsx:43; ComparisonMatrix.tsx:77; SecurityPrivacySection.tsx:85,280`
- Acceptance: Name the regulated partner and its FRN and Flump's own status, mark bank sync coming soon until G-02 is fixed, remove the matrix tick, and get legal review.
- Blocked by: none

#### M-08: Pricing page sells a Pro plan and 14-day trial that no code implements

- Severity P1, effort S, location `apps/marketing/src/pages/PricingPage.tsx:233,253,329-332,357,369,409-415`
- Acceptance: Follow G-08: relabel as coming soon with a waitlist, or build plan handling, and do not publish prices before billing exists.
- Blocked by: none

#### M-09: Encryption and transport claims conflict with Track D and with the server's actual headers

- **Status (2026-11-14):** PARTLY. The claims are reworded, but the guard does not cover "256-bit", "bank-grade", "GDPR" or "Open Banking".
- Severity P1, effort S, location `SecurityPage.tsx:126,183-187; SecurityPrivacySection.tsx:124,191; Footer.tsx:81; apps/marketing/server.ts:16`
- Acceptance: Reword to verified facts, drop TLS 1.3 and preload unless confirmed at the edge, and hold security claims until D-01 to D-04 and D-11 are closed.
- Blocked by: none

#### M-10: MCP page tells users to run npx @flump/mcp but the package is private; remote endpoint not found deployed

- Severity P1, effort S, location `apps/marketing/src/pages/McpPage/McpPage.tsx:262; McpSpotlightSection.tsx:87; packages/mcp/package.json:2-4`
- Acceptance: Publish the package without private, or change the instructions; confirm the remote host exists before advertising it.
- Blocked by: none

#### G-08: Marketing promises Pro features, trial and CSV import with no implementation

- Severity P1, effort S, location `apps/marketing/src/pages/PricingPage.tsx:233,253,357,404,409-415`
- Acceptance: Relabel as coming soon or build CSV import, scheduled sync and plan handling.
- Blocked by: none

#### G-12: Security enquiry form discards message and reports it as sent

- Severity P1, effort S, location `apps/marketing/src/pages/SecurityPage.tsx:72-79,462-468`
- Acceptance: Use mailto or a real form endpoint; remove the promise until then.
- Blocked by: none

#### I-07: Marketing promises that the product does not implement

- **Status (2026-11-14):** PARTLY. Marketing is done; mirroring the copy changes in the web app (E7 T12) was left out of scope.
- Severity P1, effort S, location `apps/marketing pricing and home; apps/web/app/routes/signUp._index.tsx`
- Acceptance: Reword or remove until implemented, or implement the plan hand-off.
- Blocked by: none

## E8. Accessibility AA

- **Status (2026-11-14, checked against `origin/main`):** mostly done. Token, field and component contrast fixes have merged (E8 web ledger; `tokens.a11y.test.ts`). J-01 and J-06 are done according to the ledger, but have only been partly spot-checked in code. The Storybook a11y CI job is still `continue-on-error` (`.github/workflows/ci-pipeline.yml:254-264`) and is due to become blocking on 2026-11-25.
- **Severity:** P1
- **Blocked by:** none
- **Done when:** Dark-mode primary and form-field contrast meet WCAG 2.2 AA; Biome a11y warnings fixed; focus is visible everywhere.
- **Notes:** Track J lists the remaining P2 items (focus, labels, live regions, mobile accessibility labels).
- **Labels:** ready-for-agent

### Tickets

#### J-01: Dark-mode primary fails contrast for button text, hover and primary text

- **Status (2026-11-14):** DONE according to the E8 ledger (T01, T06 `primary.solid`). UNVERIFIED whether `tokens.a11y.test.ts` covers dark borders and charts.
- Severity P1, effort S, location `packages/ui/src/tokens/index.ts:174-180; packages/ui/src/primitives/Button/Button.styles.ts:27-29; SliderField`
- Acceptance: Use indigo.600 for the dark solid fill, a lighter indigo.400 as dark primary text token, a darker hover step; extend tokens.a11y.test.ts to dark primary, borders, charts.
- Blocked by: none

#### J-06: Form field boundaries below 3:1

- **Status (2026-11-14):** DONE according to the E8 ledger (T03 `border.input`, T04 inputs); not re-checked in code.
- Severity P1, effort S, location `packages/ui/src/tokens/index.ts:202-208; apps/web/app/components/core/inputs/input/FLPInput.tsx:53`
- Acceptance: Define border.input at 3:1 or more in both themes and use it in FLPInput, FLPSelect and ui equivalents.
- Blocked by: none

## E9. Adopt packages/ui in apps/web and colocate components

- **Status (2026-11-14, checked against `origin/main`):** superseded by E15 (DECISIONS D3-C; the relaxed rule is in AGENTS.md section 1). The design-token baseline has fallen from about 1,228 violations to 17 in 9 files (`scripts/design-token-baseline.json`).
- **Severity:** P1
- **Blocked by:** none
- **Done when:** apps/web uses packages/ui primitives and patterns; components follow the Name/Name.tsx layout; no hardcoded colours or non-existent token names; simulator pages follow the layout laws.
- **Notes:** Large. Decide first whether web adopts packages/ui or the laws are relaxed for web (`grill-with-docs`), then plan with `wayfinder`. H-01 (token names that compile to invalid CSS) can be fixed immediately.
- **Labels:** needs-triage; H-01 is ready-for-agent

### Tickets

#### H-01: Non-existent token names compile to invalid CSS (transparent cards, non-red error text)

- **Status (2026-11-14):** UNVERIFIED. Not re-checked for non-existent token names; the baseline shrink suggests most are gone.
- Severity P1, effort M, location `apps/web/app/components/forecast/SavingsForecaster.tsx:89,126; UKTaxCalculator.tsx:134,171; AddEditAccountsDia`
- Acceptance: Map to surface.card, surface.canvas, status.danger.*; enable strictTokens and validation error
- Blocked by: none

#### H-03: Raw hex/rgb colours across 91 web files; most map to existing semantic tokens

- **Status (2026-11-14):** PARTLY. 17 violations in 9 files remain in the baseline.
- Severity P1, effort L, location `apps/web/app (components/budget 142 lines, tax 58, pension 54, home 45, dashboard/widgets 44), apps/marketing/`
- Acceptance: Codemod with hex-to-token table; add missing tokens (scrim, shadows, blue accent decision, neutral); keep bank brand colours in one constants file
- Blocked by: none

#### H-08: Law 1 colocation gap: ~95% of web components flat; ordered migration plan

- **Status (2026-11-14):** SUPERSEDED by the E15 D3-C colocation rule (AGENTS.md section 1).
- Severity P1, effort L, location `apps/web/app/components, apps/web/app/containers, apps/marketing/src/{components,pages}`
- Acceptance: 1 auto-discovering ratchet test, 2 scaffold generator, 3 retire components/core by promotion, 4 leaf widgets, 5 de-dupe home vs marketing, 6 domain by domain splitting giant files, 7 marketing, 8 consider relaxing 5-file rule for feature-internal components
- Blocked by: none

#### I-09: Simulator and dashboard layouts ignore the progressive disclosure laws

- **Status (2026-11-14):** SUPERSEDED by the E15 phase 3 screens (dashboard #609, debt #617, pension #620, mortgage #621).
- Severity P1, effort L, location `apps/web/app/containers/{mortgage,pension,debt,tax}; HomeDashboard.tsx KPI row`
- Acceptance: Adopt the layout components, starting with mortgage and pension. Overlaps Track H.
- Blocked by: none

## E11. Test and CI gates

- **Status (2026-11-14, checked against `origin/main`):** partly. The Playwright smoke suite and its CI job have merged (#525, `apps/e2e`), and web route tests and coverage floors were added (E11 ledger). Missing:
  - an end-to-end test of the new-user journey (sign up, onboarding, add account, budget entry);
  - a contract layer for web payloads (E21's real-Postgres suites cover the backend side).
- **Severity:** P1
- **Blocked by:** none
- **Done when:** CI fails on lint errors without auto-fixing, on coverage drops, and on audit findings above a threshold, and runs loader/action, contract and end-to-end tests for the core journey.
- **Notes:** Track N lists the exact CI snippets and the scripts that would enforce the AGENTS.md laws.
- **Labels:** ready-for-agent

### Tickets

#### F-07: Web route loaders/actions largely untested and excluded from coverage

- **Status (2026-11-14):** PARTLY. There are about 24 route test files, and the web coverage floors are 82/69/70/84. Not verified that the routes coverage exclusion is gone.
- Severity P1, effort M, location `apps/web/app/routes/ (22 files export loader/action; tests only for _index, $feature._index, app.onboarding, s`
- Acceptance: Call loaders/actions directly with Request objects and mocked WorkOS/backend-client; prioritise callback, logout and mutating actions; assert redirects, Authorization header, demo data never served to signed-in users; remove the routes coverage exclusion.
- Blocked by: none

#### F-11: No E2E, contract or cross-package integration layer

- **Status (2026-11-14):** PARTLY. `apps/e2e` and the `e2e-smoke` CI job exist (#525), with specs for auth and dashboard, marketing, mortgage, sandbox, the API proxy, security headers and snapshots. There is no spec for onboarding, adding an account or budget entry.
- Severity P1, effort L, location `repo-wide (no playwright, cypress, supertest or contract tooling in package.json files or workflows)`
- Acceptance: Add a Playwright smoke suite against the docker-compose stack covering sign-in, onboarding, add account, add budget entry, dashboard totals; add a contract layer (shared zod schemas in @flump/common or generated OpenAPI); run in CI on relevant PRs.
- Blocked by: none

## Shared acceptance rule

Every ticket also requires: a test that fails before the change and passes after; `bun run lint`, `bun run check-types`, `bun run test` and `bun run build` passing (AGENTS.md section 5); and the finding ID referenced in the PR description. Fixes for P0 and P1 items should be made test-first (project `tdd` skill).

## E15. Visual fidelity, styling and UX elevation

- **Severity:** P2 (product quality; absorbs open P1/P2 items I-09, I-11, I-12, I-14, K-*, L-*, H-04 to H-06)
- **Blocked by:** the E8 web sweeps merge (for any task editing apps/web/app), the E9 adopt-or-relax decision, and the owner's visual direction decision (D1). Phases 0 to 2 (discovery, tokens, ui components) can start now.
- **Done when:** one chosen visual direction expressed only through `packages/ui` tokens and components; every key screen rebuilt on them and owner-approved in light and dark at 375 and 1280 px; zero axe violations in gated stories; measured improvement against the Phase 0 baseline; visual regression guard and ratchets in CI.
- **Notes:** Full plan in `plans/E15-plan-draft.md` (written by an Opus planner; about 115 to 145 agent-days, 3.5 to 5 months elapsed with 2 or 3 worktrees, 15 to 20 hours of owner time). Recommends E15 absorbs E9's remaining scope for each screen it touches. Run its discovery together with E16 discovery. E15 Phase 1 token names must be stable before E12 builds screens.
- **Status (2026-11-14, checked against `origin/main`):** Direction C is chosen and phase 2 components have merged (#605, #610, #612, #630). Phase 3 screens merged: app shell and dashboard (#609), onboarding (#625), debt (#617, #623), pension (#620), mortgage (#621), take-home and tax leftovers (#616), accounts (#628), settings (#627), and error, empty and signed-out surfaces (#636). Shared chrome for marketing and the app merged as #645.
  - In progress: the phase 8 visual regression guard (#651).
  - Not started: the pre-release visual pass.
  - Owner action: approving the screens at 375 and 1280 px in light and dark.
  - Overall: partly done.
- **Labels:** needs-triage until owner decisions D1 to D4; Phase 0 ready-for-agent

## E16. Product and functionality review: value, journeys, bloat

- **Status (2026-11-14, checked against `origin/main`):** mostly done.
  - Discovery and the decision pack are done (`plans/E16-decision-pack.md`).
  - Execution PRs 1 to 8 have merged (#399 to #410; ledgers in `plans/E16-ledger/`): cuts T-CUT-1 to T-CUT-5, Forecast merged into Savings, demotions, Self Assessment made opt-in, and account history made read-only.
  - The T-FIX items are tracked under E23.
  - Unverified: T-DEMOTE-2 to T-DEMOTE-4, T-ADD, and agreement on the roadmap and metrics.
  - Owner action: attest that the cuts are removed, not hidden (checklist line 20).
- **Severity:** P1 for direction (decides what is kept, merged, demoted, cut or added before more polish and porting)
- **Blocked by:** none for phases 0 to 3 (read-only).
- **Done when:** every user-facing feature scored on one rubric and placed in MOST VALUABLE / NICE-TO-HAVE / BLOAT-SLOP / NO VALUE with an owner-marked action (keep, fix, merge, demote, cut, add); journey maps for the five key journeys with a time-to-first-value target; execution tickets for cuts, merges, IA changes and the top additive features, each with blast radius; roadmap and metrics agreed.
- **Notes:** Full plan in `plans/E16-plan-draft.md` (Opus planner). The first-pass bucket table in section 6 is a HYPOTHESIS to validate, not a conclusion. E6 finish/flag/delete scope is decided here. E12 mobile feature screens (M4 onwards) wait for E16's decisions; E15 page redesigns skip features marked for cut.
- **Labels:** needs-triage; phase 0 ready-for-agent

## E17. Agent and API surface (MCP tools and REST API)

- **Severity:** P1 for direction (agent access is a headline capability; today the MCP tools run on baseline sample data and the card and claims were fake)
- **Blocked by:** E1 (done: PAT-only auth, OAuth disabled). Design phases can start now. Tool scope depends on E16's verdict on whether MCP is a headline feature, and tax tools depend on the owner's E4 vector sign-off.
- **Done when:** a reviewed target design for MCP tools, resources and prompts and for the REST API contract (versioning, OpenAPI, error and pagination conventions, typed client shared with web and E12 mobile); tools work on the user's real data with scopes, consent and audit; write actions (if approved) behind explicit scopes and confirmation; an eval harness proves models select and call tools correctly; the package or remote endpoint is distributed and every marketing claim about it is true.
- **Notes:** Full plan in `plans/E17-plan-draft.md` (Opus planner). Absorbs the MCP findings of E1 D-03, E6 G-06, E7 M-10 and E11 F-03 where they concern product shape. The REST contract work overlaps E12 (API versioning, typed client, error contract): do it once.
- **Status (2026-11-14):** re-planned on 2026-11-13 ([E17-mcp-replan-2026-11.md](plans/E17-mcp-replan-2026-11.md), DECISIONS round 9) around two pillars: queryable reads and staged data entry that only the user commits. Overall: partly done. Merged:
  - Re-plan PRs A (prune) and B (query reads), together as #637.
  - PR F (compliance docs: DPIA writes addendum, Hub and perimeter corrections, terms line), as #644. It still needs the owner's signature.
  - PR C (import backend), as #650.

  In progress: PRs D (MCP write tools) and E (web review); each has a working session and neither has a PR yet. The eval runner covers 36 golden tasks. E26 is folded in.
- **Labels:** needs-triage; design phase ready-for-agent

# Added 2026-11-11 from the Fable portfolio review (E18 to E24)

Source: independent Fable review of the epic portfolio against `main` at e4ff6c3. Findings marked V were verified in code or config; I are inferences. Plans for these epics are not yet written (planners to be run, Opus for planning only).

## E18. Production operations

- **Status (2026-11-14, checked against `origin/main`):** partly; the code is done and the owner actions are open.
  - Done:
    - healthchecks: backend `/health` and `/health/ready`, web and marketing `/healthz` (#471);
    - graceful shutdown;
    - Sentry with PII scrubbing, in code (#481, #492, #505);
    - Docker images built in CI, non-root, with a HEALTHCHECK (#465, #484);
    - gitleaks (#462);
    - runbooks (#458, #464, #466);
    - one dependency bot.
  - Not met: there is only one Railway environment, now treated as staging (DECISIONS round 6), so "staging first" waits on a production environment.
  - Owner actions: the backup restore drill (`docs/runbooks/drill-log.md` is empty), the Sentry DSN and the uptime monitors.
- **Severity:** Critical. Blocks release PR 368.
- **Blocked by:** none.
- **Done when:** a staging environment exists and every release deploys there first; automated database backups are on and one restore drill is documented; healthcheck endpoints and Railway healthchecks on backend, web and marketing; graceful shutdown; error tracking with PII scrubbing, uptime checks and alerts; runbooks for deploy, rollback and migrations; shared-package changes trigger deploys (N-08); Docker images build in CI, run non-root, have a HEALTHCHECK, and exclude `.env*` (N-05, N-06, N-07); a secret scan (gitleaks) in CI (D-12, D-19); one dependency bot only and the three red Renovate PRs (335, 336, 338) triaged.
- **Notes:** Railway has one environment (production), no healthcheck path, one replica, migrations run at boot; no backup or restore evidence in the repo. Quick wins first: manual backup plus restore drill, `/health`, `noindex`.
- **Labels:** needs-triage

## E19. Privacy, legal and regulatory

- **Status (2026-11-14, checked against `origin/main`):** partly.
  - Done:
    - bank connect is owner-only (#414);
    - the "guidance, not advice" notice is on projection pages (#417);
    - the FCA enquiry is drafted (#460);
    - the MCP DPIA v0.2 draft (#644);
    - a region-move runbook.
  - Not started:
    - privacy policy, terms and cookie pages (no routes in marketing or web);
    - ROPA, processor register and retention policy;
    - account deletion that also deletes the WorkOS user (only an in-app reset of financial data exists, in Settings > Data);
    - JSON data export;
    - accessibility statement;
    - the portability addendum's export and closure statement.
  - Owner actions: ICO fee, the data region move, the FCA perimeter view, signing the DPIA, and real support and security mailboxes (`packages/business-details` still uses `.invalid` addresses).
- **Severity:** Critical for launch (owner and legal input needed).
- **Blocked by:** E21 for the delete endpoint.
- **Done when:** privacy policy, terms and cookie position published; ICO fee paid; DPIA and ROPA; processor list (Railway, WorkOS, AI clients via MCP); account deletion that also deletes the WorkOS user and revokes sessions, and a JSON data export; retention policy; data region decided (all services currently run in us-west2) or the transfer documented; FCA perimeter view obtained for token-based bank connection and user-specific debt and investment guidance, with bank connect flagged off until then; "guidance, not advice" framing on every projection page (L-01); accessibility statement; real monitored support and security mailbox.
- **Notes:** none of this is owned by an existing epic; E12's account-deletion item B6 depends on it. Several decisions are the owner's and legal's, not the code's.
- **Labels:** needs-triage

## E20. Session and application security hardening

- **Status (2026-11-14, checked against `origin/main`):** mostly done.
  - Done:
    - the access token stays on the server (#569, #578);
    - rate limiting (#473, plus the MCP limiter);
    - MCP scopes enforced (#511);
    - receipt MIME validation (#515, #555);
    - logout by POST only;
    - the cookie-domain check fixed;
    - D-09 and D-13 to D-16 (#390);
    - a threat model (`docs/security/threat-model.md`).
  - Partly: the web nonce CSP is report-only (#603); only HSTS, X-Frame-Options and `frame-ancestors` are enforced.
  - The threat model's access-token row is out of date.
- **Severity:** Critical.
- **Blocked by:** none (E5 done).
- **Done when:** the access token is no longer returned to browser JS (moving the remaining browser mutations into route actions, the E5 D3 option B follow-up); CSP, HSTS and frame headers on web and backend; rate limiting beyond `packages/mcp` (for example `@nestjs/throttler`); password change needs re-authentication and the reset-email `email` body parameter is dropped; receipt upload MIME validation and no `href={receiptData}` data-URL links; logout cannot be triggered by GET and the `endsWith(<old domain>)` cookie-domain check is fixed; MCP scopes enforced (D-17); minor items D-09, D-13 to D-16 (TCP proxy on port 3000, `e.stack` in marketing responses, CORS defaults, CSP wildcard); threat model written.
- **Notes:** the "follow-up security epic" promised in SEQUENCE.md (E5 D3) was never created.
- **Labels:** needs-triage

## E21. API contract and validation

- **Severity:** Important (blocks E12 M1 and E17 build phases).
- **Blocked by:** none.
- **Done when:** zod schemas (or equivalent) for every mutating endpoint with global request validation, closing D-08 and B-02 (the endpoints that still take `body: any`); an OpenAPI spec generated from the code; API versioning and an error and pagination convention; a typed client shared by web, the E12 mobile app and E17 agents; contract tests that run web payloads against real controllers on real Postgres (the in-memory repository hides bugs like the onboarding 500s); decimal columns returned as numbers with a policy (B-05).
- **Notes:** this is one piece of work needed by three epics (E12, E17, validation). Do it once, here.
- **Status (2026-11-13; merged as #634 on 2026-11-14):** done for the backend. Every route in `packages/api-contract/src/manifest.ts` has request schemas, and every JSON route has a strict response schema (`NON_JSON_RESPONSE_ROUTES` lists the four that are not JSON). `HELD_BACK_GROUPS` is empty and `CONTRACT_MODE` defaults to `enforce` (`shadow` and `off` are incident escape hatches). Responses are checked in every mode and logged as `contract_response_violation`, never rejected; the real-Postgres contract and authz suites fail on any such line. The OpenAPI document carries the response schemas. Follow-ups: the typed client still takes ad hoc response parsers rather than the contract schemas (E12 M1 should adopt them); `createAccount` skips the stored-balance sign rule that update applies (E23 C-15).
- **Labels:** needs-triage

## E22. Tax-year and rates maintenance

- **Status (2026-11-14, checked against `origin/main`):** partly; phase 1 merged (#411, #413, #415).
  - Done:
    - the annual update runbook (`docs/runbooks/tax-year-update.md`);
    - one strict resolver for unsupported years (`uk-tax-year.ts:225`, used by `calculateUKEWNITakeHome`);
    - a CI check that fails from 1 March (`scripts/lib/tax-year-calendar.ts`);
    - the `tax:signoff` workflow.
  - Partly: the stale-rates banner is on the tax, take-home, pension and tax-trap views, but missing on savings and forecast, budget, onboarding and home.
  - Not started: the 2027/28 rates file.
  - Owner actions: verifying the 2027/28 figures and signing off the vectors.
- **Severity:** Important (hard deadline: 6 April 2027).
- **Blocked by:** E4 owner sign-off.
- **Done when:** an annual update runbook; a sourced rates file for 2027/28; a CI test that fails from 1 March if the next tax year's table is missing; a visible "using 2026/27 rates" banner when the date is past the last supported year; one consistent behaviour (the strict resolver throws, but `calculateUKEWNITakeHome` silently falls back to 2026/27 at `tax-rules.ts:1129-1133` and `uk-tax.ts:69`); a sign-off workflow for vectors (the vector test currently asserts `signedOffBy` is null for every vector).
- **Labels:** needs-triage

## E23. Core-journey correctness

- **Severity:** Critical.
- **Blocked by:** E4.
- **Done when:** E16 T-FIX-1 to T-FIX-7 done (onboarding Finish 500s, `PATCH /accounts/:id` 404, region, age and student-loan plan stored and used); C-11 fixed (`_index.tsx:152` estimates tax due as `netProfit * 0.29`); C-15 fixed (`portfolio.ts:167` uses `Math.abs` so overdrawn assets count positive); C-16, C-17 (a failed balance call writes 0); one take-home source of truth across pages; a Playwright smoke test for sign-in, onboarding, add account, budget entry and dashboard totals (E11 F-11).
- **Notes:** the onboarding and PATCH fixes are in flight as a separate session; E16 holds these bug fixes inside a review epic and they should be tracked here so "not started" does not hide them.
- **Status (2026-11-14, checked against `origin/main`):** partly.
  - Done:
    - T-FIX-1, onboarding Finish and `PATCH /accounts/:id` (#556, #563);
    - T-FIX-2, region, age and student-loan plan stored and used (#556, #564, #570);
    - T-FIX-5, the one-request balance check-in with a unique month key (#608);
    - C-15 and C-16 (#583, #608);
    - one financial picture for safe to spend, months of cover and budget totals, with a cross-page consistency harness (#638).
  - Partly:
    - C-11: `_index.tsx:157` hides the figure (`estimatedTaxDue = null`) instead of computing it;
    - one take-home source across pages (waits on E25 T5 and T15);
    - T-FIX-7.
  - Unverified: C-17, T-FIX-4 and T-FIX-6.
  - Missing: the Playwright smoke test for onboarding, adding an account and budget entry; `apps/e2e` covers only sign-in and the dashboard.
- **Labels:** ready-for-agent for T-FIX items

## E24. Launch readiness and business model

- **Status (2026-11-14, checked against `origin/main`):** partly.
  - Done:
    - a truthful free-beta pricing page (#601);
    - the entitlements design (#459);
    - the placeholder guard (#489, #526);
    - launch-gated `noindex` (#506);
    - privacy-first analytics (#517);
    - a feedback mailto and a contact page (#507, #615).
  - `bun scripts/check-launch-readiness.ts` reports 7 pass, 8 fail and 10 unattested. Some of the failures are false, because `docs/launch/readiness.json` points at files that have moved: the pricing page, the HSTS sources, `rollback.md`, and the E2E spec path.
  - Owner actions: the domain and email, real company details, and the launch attestations.
- **Severity:** Important.
- **Blocked by:** E18, E19, E20.
- **Done when:** a pricing or free-beta decision stated truthfully on the pricing page; entitlements designed if paid; a production-build guard that fails on placeholder text once a launch flag is set (`apps/marketing/src/utils/placeholders.ts` holds `£X`, a placeholder company and `security@example.invalid`); a custom domain and email; `noindex` and robots disallow removed deliberately at launch; privacy-first analytics after the cookie decision; a feedback loop and support channel; the launch-readiness checklist below passes.
- **Labels:** needs-triage

### Housekeeping from the same review

- Close E6: its findings moved (G-04 to E16 T-CUT-4, G-06 to E17, I-08 to E16 T-CUT-5 and T-DEMOTE-4).
- Fold E9 into E15 after E16's cuts, then re-baseline the token ratchet. (2026-11-14: done in effect; the baseline is now 17 violations in 9 files.)
- EPICS.md has no sections for E10, E12, E13 and E14 yet; write them or fold them.
- The audit documents (`docs/audit/`) are untracked; commit them so a worktree clean-up cannot lose them (the E12 plan lives only in one worktree).

### Launch-readiness checklist (public launch)

Checked against `origin/main` on 2026-11-14. A box is ticked only where there is evidence in code or merged PRs.

- [ ] Staging environment exists and every release goes there first. *Not met:* the one Railway environment is now staging (DECISIONS round 6), and no production environment exists yet. Staging runbook in #464.
- [ ] Automated backups on, and one restore drill documented. *Owner action:* scripts and runbook are ready (#466), but `docs/runbooks/drill-log.md` has no entries.
- [ ] Healthchecks, error tracking, uptime alerts and a rollback runbook. *Partly:* healthchecks (#471) and Sentry scrubbing (#481, #492, #505) are in code, and rollback steps sit inside other runbooks. *Owner action:* set the Sentry DSN and the uptime monitors.
- [ ] New-user journey passes an automated end-to-end test (sign up, onboarding, add account, dashboard). *Not met:* `apps/e2e` covers sign-in and the dashboard only.
- [ ] Owner has signed off all seven years of tax vectors; no flat-rate or invented figure remains (C-11, C-15). *Owner action:* all vectors have `signedOffBy: null`. C-15 is fixed (#583). C-11 is hidden as `null`, not computed.
- [x] 2027/28 handling defined; stale-rates banner in place. Strict resolver (#411), the 1 March CI check and the banner on the tax pages. The banner is still missing on savings, budget, onboarding and home (E22).
- [ ] Access token not exposed to browser JS; CSP, HSTS and frame headers on web and backend. *Partly:* the token stays on the server (#569, #578) and HSTS and frame headers are enforced, but the full web CSP is report-only (#603).
- [x] Rate limiting on auth-adjacent and MCP endpoints; password change needs re-auth. Rate limiting in #473 and #511. Password change was removed, and the reset email uses the session user.
- [x] Request validation on every mutating endpoint; two-user IDOR test suite green. Contract enforce mode (#634) and the authz suites (#516, #574).
- [ ] Secrets from git history rotated (D-12); WorkOS issuer pinned; gitleaks in CI. *Owner action:* rotation. The issuer is pinned (#530) and gitleaks runs in CI (#462).
- [ ] Privacy policy, terms and cookie position published; ICO fee paid; DPIA done. *Not met:* there are no legal pages. *Owner action:* the ICO fee, and signing the DPIA (still a v0.2 draft).
- [ ] Account deletion and data export work end to end, including the WorkOS user. *Not started:* only a reset of financial data exists.
- [ ] Data region decided (EU or UK) or the transfer documented. *Owner action:* EU West is decided (DECISIONS round 3) and `docs/runbooks/region-move.md` exists. Not shown as done.
- [ ] FCA perimeter view obtained; bank connect off or covered; "guidance, not advice" on all projections. *Owner action:* the perimeter view (E29b). Bank connect is owner-only (#414), and the guidance notice is done (#417).
- [ ] No placeholder text in the production build; real company details, security contact and support mailbox. *Owner action:* the guard is built (#489, #526), but `packages/business-details` still holds placeholders.
- [ ] Custom domain live; cookie domain logic corrected; noindex removed deliberately. *Owner action:* the domain. The cookie logic is fixed (E20), and the launch-gated noindex switch is ready (#506).
- [ ] Pricing or free-beta position stated truthfully on the pricing page. *Owner attestation pending:* the page is done (#601), but `readiness.json` points at the old file path.
- [x] Docker images build in CI, run non-root, and shared-package changes trigger a deploy. Done in #465 and #484, plus the watch patterns.
- [ ] axe passes on kept screens in light and dark; accessibility statement published. *Not met:* there is no accessibility statement, and the Storybook a11y job is still advisory until 2026-11-25.
- [ ] Features marked cut by E16 are removed or flagged off, not merely hidden. *Owner attestation pending:* E16 PRs 1 to 8 merged (#399 to #410).

# Added 2026-11-12 from the UK market research (E25 to E29)

Source: [docs/research/market-research-2026-11.md](../research/market-research-2026-11.md) section 8. The numbers E25 to E29 do not collide with E1 to E24, so they are kept as proposed. Plans: [E25](plans/E25-plan.md) and [E29](plans/E29-plan.md) are ticketed; E26, E27 and E28 are not planned yet (E26 waits on E25 and E29). The E19 portability addendum (last subsection) extends E19 rather than opening an epic.

## E25. UK tax-year rules and marginal-rate what-if planner

- **Severity:** P1 for direction (lead differentiator; correctness is a launch gate).
- **Blocked by:** E4 (owner sign-off of tax vectors) and E22 (tax-year maintenance) for any shipped figure; design can start now.
- **Done when:** every tax rule is versioned by tax year with a source URL and test vector; one engine answers "what happens to my take-home if my gross changes by X" across the £100k taper, High Income Child Benefit Charge, salary sacrifice (including the April 2029 £2,000 cap), Plan 2 and Plan 5 student loans, and Scottish bands; marginal-rate and cliff views shown on the home and calculator pages with an "as at tax year" label; marketing calculators and the app share one engine; all copy is guidance, not advice.
- **Notes:** the lead opportunity (backlog #1). Evidence: HMRC-derived counts of 698,000 in the 60% band and 2.29m by 2028-29. Do not model a household-basis child benefit charge or any Budget 2026 change until confirmed on gov.uk. Scotland is a correctness requirement, not a demand-led feature.
- **Status (2026-11-14):** plan in [E25-plan.md](plans/E25-plan.md). Overall: mostly done.
  - Merged:
    - T1 to T3 (#512, #561, #592);
    - the engine (take-home core, thresholds, what-if, marginal-rate curve; T4 and T6 to T8, #631);
    - the marginal-rate explorer with the public pay-rise tool (T9, T10, T12, #639);
    - the calculator rebuild, planner and tax widget (T11, T13, T14, #649).
  - Partly: the T5 adapter. `calculateUkTax` (`uk-tax.ts:420`) is still a separate engine, shown to agree with `computeUkTakeHome` by a differential test (`uk-take-home.test.ts:120`), not rebuilt as an adapter over it.
  - Not started: T15, the one-engine guard in `check:laws`; two app call sites still use `calculateUKEWNITakeHome`.
  - Figures stay "unverified" until the owner signs the tax vectors (E4).
- **Labels:** needs-triage

## E26. Tax-aware agent tools (extension of E17)

- **Status (2026-11-14):** cancelled; folded into E17 (DECISIONS round 9). Nothing to do here.

> **Folded into E17 on 2026-11-13** (DECISIONS.md round 9, [E17-mcp-replan-2026-11.md](plans/E17-mcp-replan-2026-11.md)). The tax part is the single `get_tax_year_position` read tool; no further calculators are planned. The text below is kept for history.

- **Severity:** P2 (differentiator; depends on E25 and E29).
- **Blocked by:** E17 design, E25 engine, E29 compliance gate.
- **Done when:** MCP tools and prompts expose the E25 engine ("what if I sacrifice £X", "show my marginal rate", "explain my take-home") with read-only default scopes, explicit consent for any write, an audit log and per-tool descriptions worded as guidance; an eval harness proves models select tools correctly and do not output personal product recommendations; a DPIA covers disclosure to the model provider and transfers; marketing claims match what ships.
- **Notes:** supply side is crowded with unofficial community servers and none is official, but demand for MCP specifically is unproven; measure beta usage before investing beyond the first tools. Fold into E17 if the owner prefers one epic.
- **Labels:** needs-triage

## E27. UK retirement and pension projection

- **Status (2026-11-14, checked against `origin/main`):** not started as an epic; there is no plan and no PR.
  - Existing pieces: contributions, tax relief, the tax-free lump sum and the state pension, all in the current forecaster (State Pension rates #527).
  - Not started: UFPLS, inheritance tax on pensions from April 2027, a MoneyHelper pension link (the only MoneyHelper link is on the debt page), and the self-employed saving gap.
- **Severity:** P2.
- **Blocked by:** E4 vectors for pension tax rules; E29 for projection wording.
- **Done when:** projection shows contributions, tax relief, UFPLS and PCLS options, state pension and the effect of inheritance tax on unused pensions from 6 April 2027, with assumptions visible and editable; manual pension entry with links out to MoneyHelper, no dashboard connection claimed; self-employed saving gap shown for self-employed users.
- **Notes:** ProjectionLab already models UK UFPLS and PCLS, so Flump's angle is the link to take-home and the ledger, not scenario depth. Pensions Dashboards public launch is expected in FY2027-28 (UNVERIFIED), and third-party access is unlikely.
- **Labels:** needs-triage

## E28. MTD for Income Tax discovery spike

- **Status (2026-11-14):** not started. There is no decision and no user evidence yet (E30 plan, owner question O3), and the decision is due before April 2027. No "MTD-compliant" claim appears in the copy.
- **Severity:** P3 (spike with a dated decision).
- **Blocked by:** none for discovery; a submission build needs HMRC recognition work.
- **Done when:** a written decision before April 2027 on one of three paths: (a) record and quarterly estimate with export to bridging software only, (b) HMRC-recognised submission, (c) do nothing; evidence from at least five beta self-employed or landlord users; the ledger's labels never claim "MTD-compliant" unless the digital-links and fraud-prevention requirements are met.
- **Notes:** segment size is verified (2.88m landlords; MTD live April 2026, phase 2 April 2027), but no direct demand for Flump was found and the market is crowded and cheap (FreeAgent free with some bank accounts). Scope counts in press conflict; use gov.uk or ICAEW.
- **Labels:** needs-triage

## E29. Advice-boundary and AI compliance gate

- **Severity:** Critical for the friends beta (gates E25 copy and E26).
- **Blocked by:** owner and legal input.
- **Done when:** a lawyer's FCA perimeter opinion covers projections, salary-sacrifice and pension "optimise" outputs and LLM replies through MCP; a copy review applies "guidance, not advice" wording and removes "you should" language on investments, pensions and mortgages; no segment-based nudges (targeted support is regulated); an MCP DPIA covers lawful basis for disclosure to the model provider, transfers, Article 9 inference, retention and no training on user data; Consumer Duty principles adopted voluntarily.
- **Notes:** extends E19, which currently asks for the perimeter view at launch; the research suggests it is needed before the friends beta. Targeted support went live 6 April 2026.
- **Round 4 split (DECISIONS.md):**
  - **E29a** is free: copy rules, the advice-language guard, disclaimers, the MCP DPIA draft and a widened Innovation Hub enquiry. It gates the friends beta, the E25 copy and E26.
  - **E29b** is the lawyer's perimeter view, inside the launch fixed-fee engagement. It gates public launch and opening E26 to non-friends.
  - E26 and E27 are blocked by E29a, and by E29b before non-friends.
- **Status (2026-11-14):** partly. E29a built pieces have merged: the MCP allowlist (`apps/backend/src/mcp-access.ts`), the MCP output policy, the advice-boundary copy sweep with the allow-list shrink and rulings log (#633), and the MCP DPIA draft (now v0.2, with a staged-import addendum in E17 re-plan PR F, #644). Owner actions still open: sign the advice-boundary policy and the DPIA, send the Innovation Hub enquiry. E29b (the solicitor) is at launch.
- **Labels:** needs-triage

## E30. Monthly snapshots and the check-in habit

- **Severity:** P2 (retention; the owner's own sheet is the model).
- **Blocked by:** PR1 none (owner runs the E18 backup drill before staging); PR3 needs the owner's email provider choice and a PECR opinion.
- **Done when:** the first onboarding data is the first monthly snapshot; the user can check in each month from a prefilled form (connected accounts auto-fill, manual edits stick); net worth over time shows month-on-month deltas with carry-forward marked; a user-chosen reminder day sends a figure-free, consent-gated email with one-click unsubscribe; v2 adds actual vs forecast, mortgage reconciliation, crossover, allocation, debt paydown, an MCP history tool and CSV export.
- **Notes:** evolves `account_details` rather than adding a history table. No streaks or badges, deltas worded the same up or down, assumptions never auto-recalibrated, Europe/London only. Plan: [E30-monthly-snapshots-plan.md](plans/E30-monthly-snapshots-plan.md). PR1 (backend and engine) overlaps E23 section 6.
- **Status (2026-11-14):** PR1, backend and engine (#614), and PR2, the web check-in, history page and back-fill (#640), have merged. The MCP history tool from v2 shipped early as `get_balance_history` (#637). PR3 (reminder email) waits on the owner's email provider choice and a PECR opinion. The rest of v2 (actual vs forecast, mortgage reconciliation, CSV export and the other items) is not started. Overall: partly done.
- **Labels:** needs-triage

## E31. Majority positioning

- **Severity:** P1 for direction (owner requirement, 2026-11-13).
- **Blocked by:** none.
- **Done when:** the marketing site and the app lead with the monthly picture and the everyday decisions most people make (renting or a mortgage, debts, pension, a pay rise), not the £100k tax trap, which stays as one tool among many; copy never judges someone's situation or ranks one above another ([copy-style-guide.md](../copy-style-guide.md)); the debt page carries one neutral MoneyHelper line and benefits are signposted only ([advice-boundary-policy.md](../compliance/advice-boundary-policy.md)).
- **Status (2026-11-14):** done. PR-A, the marketing site (#624), and PR-B, the app and MCP (#632), have merged. The MCP prompt PR-B renamed was then deleted by the E17 re-plan (#637).
- **Labels:** done

## E32. Housing costs: saved details and deposit timeline

- **Severity:** P2.
- **Blocked by:** none.
- **Done when (as shipped in #648):** housing costs (rent or mortgage) are saved details read by the headline figures, with any what-if kept in a scenario zone that never writes to saved data; a deposit timeline shows when a saved deposit target is reached from recorded figures, with neutral wording that does not rank renting below owning.
- **Status (2026-11-14):** done.
  - #648 merged the housing cost share, the fix-end date and the deposit timeline.
  - Follow-up review fixes landed in de11185c (copy and UI) and 7b9b6425 (one scenario zone and one guidance notice on the savings page).
  - Not re-checked in code: that the saved housing details feed the headline figures, and that the scenario zone never writes to saved data.
- **Labels:** done

### Addendum to E19: portability

Add to E19 (opus review: effort S, so fold in rather than a new epic): full JSON and CSV export of every user-owned dataset, CSV import for users arriving from other apps, and an honest statement of what happens to user data if the service closes. Do not publish a "shutdown-proof" claim without a run-off plan.

