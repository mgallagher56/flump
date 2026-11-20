# Epics and ticket drafts

Derived from [SUMMARY.md](SUMMARY.md). Items are the 64 verified P0 and P1 findings plus D-12 (P2, included because it needs a rotation); P2 and P3 items live in the track files (A to N). **No tickets have been created.** The tracker is GitHub (docs/agents/issue-tracker.md); labels follow docs/agents/triage-labels.md. Every draft starts as `needs-triage` unless noted, because the audit does not replace the maintainer's decision.

Epic grouping is the lead auditor's reading of the verified titles. Severity and effort come from the verified record. Acceptance criteria are the recommendation from each finding plus the shared rule at the end of this file.

## What is left (as of 2026-11-20)

This section was first audited against `origin/main` at 7b9b6425 on 2026-11-14. Every epic below carries a dated status line, and tickets that are not done carry their own marker. "Partly" means some of the work has merged; the epic's status line says what is missing.

Refreshed on 2026-11-20 against `origin/main` and the merged pull requests up to #832. The tables below and the status lines of the epics that changed since 2026-11-14 are current. A status line that still carries a 2026-11-14 date was not re-checked on 2026-11-20 and may be stale. Where a line below says "not re-checked", the code was not looked at.

### Engineering work not started or partly done, by launch importance

| # | Epic / ticket | Work | State |
|---|---|---|---|
| 1 | E19 | Account deletion including the WorkOS user, and JSON data export | Done (BE-04, #668); export writes an audit row first (BE-15, #725). Until the owner sets `DELETION_TOMBSTONE_KEY`, deletion returns 503 and changes nothing |
| 2 | E19 | Pages for the privacy policy, terms, cookie position and accessibility statement (text from owner and legal) | Not started |
| 3 | E11 F-11, E23 | E2E test of the new-user journey: sign up, onboarding, add account, budget entry | Done (#701) |
| 4 | E20 | Enforce the full web CSP (report-only since #603) | Partly |
| 5 | E18 | A production environment separate from staging, so releases go to staging first | Not started |
| 6 | E23, E4 C-11 | Compute the real estimated tax due (now `null`); verify C-17 | Done (`selectEstimatedTaxDue` feeds the dashboard; C-17 verified: providers throw, never report 0) |
| 7 | E4 C-10 | A lone bonus record replaces the salary | Done (bfcb776a); one payslip no longer replaces the saved salary either (engine PR) |
| 8 | E25 T5, T15, E4 B-07 | Rebuild `calculateUkTax` as an adapter; one-engine guard; move web calculators onto finance-engine | Done for tax (engine PR): adapter, `check-one-tax-engine` in `check:laws`. The B-07 mortgage and savings formulas in web remain |
| 9 | E22 | Stale-rates banner on savings, budget, onboarding and home | Partly |
| 10 | E24 | Fix stale paths in `docs/launch/readiness.json` | Done (BE-01) |
| 11 | E8 | Make the Storybook a11y job blocking (due 2026-11-25) | Done: blocking in `ci-pipeline.yml` and listed in `.github/required-checks.json`. Whether branch protection requires it is not re-checked |
| 12 | E1 D-06, C-18, F-03 | Transactional deleteAccount; MCP auth coverage to 80% | Partly: deletion runs in one transaction (BE-04, #668, per the backend re-score); MCP auth coverage not re-checked |
| 13 | E3 B-04, D-11, N-02 | Foreign keys and indexes; key id for bank tokens; zod env schema | Done in code per the backend re-score: foreign keys (BE-08, #675), indexes proven by a query-plan test, versioned bank token keys (BE-12, #672), `config/env.schema.ts` |
| 14 | E7 M-09, I-07 | Widen the claims guard; mirror the copy changes in web | Done: the marketing claims guard and the web copy guard now also ban "256-bit", "bank-grade", "GDPR" and "Open Banking"; no source used them |
| 15 | E2, E1 G-03 | Salary-sacrifice defaults; delete the mock token and fake accounts in the parked mobile app | Mobile part done: `apps/mobile-companion` was deleted (#827). Salary-sacrifice defaults not re-checked |
| 16 | E15 | Pre-release visual pass | Not started |
| 17 | E9 H-03 | Last 17 design-token violations | Partly |
| 18 | E27, E28, E30 v2 | Pension projection epic; MTD decision (before April 2027); snapshot v2 | Not started |
| 19 | Backend | Re-score follow-ups (backend-2026-11/RESCORE.md): BE-16 conditional writes, BE-17 performance and tests, BE-18 bank launch readiness, SEC-D receipt encryption, SEC-E CI and images, SEC-F audit-trail integrity; SEC-A waits for the owner's variables | Done in code: BE-01 to BE-14; BE-15 with SEC-B (#725); BE-16 (#733); BE-17 with SEC-E (#730); BE-18 (#752); SEC-D (#753); SEC-A and SEC-F (#738). SEC-A makes the keys required at production boot, so the owner's variables must be set before a production deploy |
| 20 | E16 | Design polish rounds 2 and 3 | Done: merged (#697 to #728). The R3 re-score is in `docs/design/e16-polish/RESCORE-R3.md` |
| 21 | E33 | Retirement plan: a target the user sets, tracked each month (E27 becomes its tax slices) | Plan approved 2026-11-17 (RD1 to RD11 accepted); S0 to S5 merged (#750, #758, #768), RD6, RD9 and RD11 merged (#770). S6 to S9 not started |
| 22 | E36 | Security hardening before real production: supply chain, accounts, breach impact, post-quantum readiness, AI-assisted attacks, external test | Slice 1 (#747) and H2 and H5 (#755) merged. MFA and passkeys, the restricted database role, field-level encryption, the breach drill and the external test have no PR. Owner approval of SD1 to SD8: not re-checked |
| 23 | E37 | Self-employed work tracking & invoice builder: default hourly rate, itemised work logs, draft/issued/paid invoices, PDF/print & CSV export, optional SA sync | Plan merged (#759); nothing built. Owner approval: not re-checked |
| 24 | E38 | User action friction and interaction-efficiency audit | S0 harness merged (#780, warn-only CI job). S1 to S3 not started |
| 25 | E39 | Mortgage affordability from your own figures | Plan merged (#776); nothing built |
| 26 | E40 | One home per value: system data audit and restructure | Done: all nine slices merged (#784, #785, #786, #791, #798 and #803, #797 and #801, #825, #806, #805 and #808 and #820). Owner tax sign-off of the vectors in slices 2 and 7 is open |
| 27 | E41 | Mutation testing and faster tests | In progress: see the E41 status line. M4 is in progress; M5 waits for the owner |
| 28 | E42 | Marketing site restructure: pages split the way the app is, selling the features it has | Plan written 2026-11-20; all ten owner decisions answered that day; nothing built. First in line once the open work has merged |

### Work in progress

| Epic / ticket | Work | Where |
|---|---|---|
| E41 M4 | Mutation testing of the backend guards and services | In progress, no PR yet |
| E17 | MCP write tools (PR D, #653) and web review of staged imports (PR E, #654) | Merged; nothing in progress |
| E15 phase 8 and follow-ups | Visual regression guard (#651), follow-up sweep (#647) | Merged |
| E4 tax | 2027/28 tax year with property and savings rates | #833, open, needs the owner's tax sign-off |

### Owner actions

| Epic | Action |
|---|---|
| E4, E22, E25 | Sign off the tax vectors (334 unsigned, 41 of them the Self Assessment vectors added by the engine PR); verify the 2027/28 figures |
| E18 | Run and log the backup restore drill; set the Sentry DSN and uptime monitors; create a production environment |
| E3 D-12 | Done: the WorkOS key was rotated on 2026-11-13 |
| Backend | Set `DELETION_TOMBSTONE_KEY` (never rotate it), `WEB_CLIENT_IP_HMAC_KEY` and `WORKOS_API_KEY`; add the WorkOS logout redirects (BE-04); run the retention cron service; apply the required checks and secret scanning on GitHub; choose the terms version for consent |
| E19, E29b | ICO fee; legal text; data region move; FCA perimeter view from the solicitor |
| E29a, E17 PR F | Sign the advice-boundary policy and the MCP DPIA; send the Innovation Hub enquiry |
| E24 | Custom domain and email; real company details and mailboxes; launch attestations |
| E30 PR3 | Choose the email provider and get a PECR opinion for reminders |
| E15, E16 | Approve screens in light and dark; attest that the E16 cuts are removed |

## Order

E1 blocks E2, E5 and E6 (do not build on an unauthenticated backend). E3, E4 and E7 are independent and can run alongside E1. E9 and E12 wait on decisions. E10, E13 and E14 have no P0/P1 items; their backlog is the P2/P3 lists in tracks A, E, K and L. E12 (mobile companion) has no P1 of its own besides B-07: decide whether to finish it or park it, then plan from Track G and Track J.

## E1. Real authentication and authorisation, fail closed

- **Status (2026-11-20, checked against `origin/main`):** partly. The fail-closed core merged in #369: JWKS verification, the dev bypass gated off production, the MCP verifier rejecting OAuth JWTs, and web redirecting to /login. D-01, D-02, D-04, B-01, D-03, F-01 and D-07 are done. Request validation (D-08, B-02) landed later through E21's global zod contract interceptor (#634). Still open: deleteAccount is not transactional (D-06, C-18); MCP auth coverage is below the 80% target (F-03); G-03 is resolved because `apps/mobile-companion` was deleted (#827).
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

- **Status (2026-11-20):** DONE. Web, backend and MCP merged in #369 (flag-gated). The mock token and the fake-account fallback in `apps/mobile-companion` are gone with the app, which was deleted in #827.
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
  - D-12: the owner rotated the WorkOS key on 2026-11-13.
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
  - C-10 and C-11 are done (bfcb776a, `selectEstimatedTaxDue`). The engine PR added the trading and property allowances, payments on account and month-by-month payslips, and removed the second tax implementations.
  - Still open: the B-07 web mortgage and savings calculators still have their own (non-tax) formulas.
  - Owner action: all 334 vectors are unsigned (`signedOffBy` is null), so every figure stays unverified.
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

- **Status (2026-11-14):** DONE (bfcb776a): bonus, commission, overtime and benefit records add to the salary. The engine PR also stops one logged payslip replacing the saved salary: payslips cover their own months and the saved salary covers the rest.
- Severity P1, effort S, location `packages/finance-engine/src/tax-calculator.ts:463-465`
- Acceptance: Add logged income to the profile salary or require an explicit mode.
- Blocked by: none

#### C-11: Dashboard estimated tax due is a flat 29% of all records

- **Status (2026-11-14):** DONE. `selectEstimatedTaxDue` (finance-engine picture) computes the figure and `apps/web/app/routes/_index.tsx` reads it; it is unknown, not £0, when there is no income outside PAYE.
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

- **Status (2026-11-14, checked against `origin/main`):** mostly done (commits 6278f571, 32f9d2f5 and 16ae682f; guard test `apps/marketing/src/claims.test.ts`). M-07, M-08, M-10, G-08 and G-12 are done; M-06 is partly done; M-09 and I-07 are done (2026-11-20). Later work built on it: E24 T4 pricing (#601), E31 (#624) and E17 (#637).
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

- **Status (2026-11-20):** DONE. The claims are reworded, and `apps/marketing/src/claims.test.ts` bans "256-bit", "bank-grade", "GDPR" and "Open Banking".
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

- **Status (2026-11-20):** DONE. Marketing is done. The web app source holds none of the removed claims, and `apps/web/app/copy-guard.test.ts` now bans them there too (E7 T12).
- Severity P1, effort S, location `apps/marketing pricing and home; apps/web/app/routes/signUp._index.tsx`
- Acceptance: Reword or remove until implemented, or implement the plan hand-off.
- Blocked by: none

## E8. Accessibility AA

- **Status (2026-11-20, checked against `origin/main`):** mostly done. Token, field and component contrast fixes have merged (E8 web ledger; `tokens.a11y.test.ts`). J-01 and J-06 are done according to the ledger, but have only been partly spot-checked in code. The Storybook a11y CI job is blocking (since BE-01) and is a required-check name in `.github/required-checks.json`.
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
    - T-FIX-7.
  - Done since: C-11 (`selectEstimatedTaxDue`), one take-home source (E25 T5 and T15, engine PR), and C-17 verified (bank providers throw on a failed balance call, pinned by `provider-failure-modes.spec.ts`).
  - Unverified: T-FIX-4 and T-FIX-6.
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
  - `bun scripts/check-launch-readiness.ts` reports 9 pass, 5 fail and 11 unattested. The stale paths in `docs/launch/readiness.json` (pricing page, HSTS sources, rollback runbook, E2E spec folder) were fixed in BE-01, and a test now fails if a scanned path does not exist. The five failures are real gaps: the new-user E2E spec, legal pages, deletion and export, placeholder business details and the accessibility statement.
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

Checked against `origin/main` on 2026-11-14. A box is ticked only where there is evidence in code or merged PRs. Each line's text must match `docs/launch/readiness.json` exactly (`scripts/check-launch-readiness.test.ts`), so the notes sit on indented sub-bullets.

- [ ] Staging environment exists and every release goes there first
  - Not met: the one Railway environment is now staging (DECISIONS round 6), and no production environment exists yet. Staging runbook in #464.
- [ ] Automated backups on, and one restore drill documented
  - Owner action: the scripts and runbook are ready (#466), but `docs/runbooks/drill-log.md` has no entries.
- [ ] Healthchecks, error tracking, uptime alerts and a rollback runbook
  - Partly: healthchecks (#471) and Sentry scrubbing (#481, #492, #505) are in code, and rollback steps sit inside other runbooks.
  - Owner action: set the Sentry DSN and the uptime monitors.
- [ ] New-user journey passes an automated end-to-end test (sign up, onboarding, add account, dashboard)
  - Not met: `apps/e2e` covers sign-in and the dashboard only.
- [ ] Owner has signed off all seven years of tax vectors; no flat-rate or invented figure remains (C-11, C-15)
  - Owner action: all vectors have `signedOffBy: null`.
  - C-15 is fixed (#583). C-11 is hidden as `null`, not computed.
- [x] 2027/28 handling defined; stale-rates banner in place
  - Done: the strict resolver (#411), the 1 March CI check, and the banner on the tax pages.
  - The banner is still missing on savings, budget, onboarding and home (E22).
- [ ] Access token not exposed to browser JS; CSP, HSTS and frame headers on web and backend
  - Partly: the token stays on the server (#569, #578), and HSTS and frame headers are enforced.
  - Missing: the full web CSP is report-only (#603).
- [x] Rate limiting on auth-adjacent and MCP endpoints; password change needs re-auth
  - Rate limiting in #473 and #511. Password change was removed, and the reset email uses the session user.
- [x] Request validation on every mutating endpoint; two-user IDOR test suite green
  - Contract enforce mode (#634) and the authz suites (#516, #574).
- [ ] Secrets from git history rotated (D-12); WorkOS issuer pinned; gitleaks in CI
  - Owner action: the rotation.
  - Done: the issuer is pinned (#530), and gitleaks runs in CI (#462).
- [ ] Privacy policy, terms and cookie position published; ICO fee paid; DPIA done
  - Not met: there are no legal pages.
  - Owner action: pay the ICO fee and sign the DPIA (still a v0.2 draft).
- [ ] Account deletion and data export work end to end, including the WorkOS user
  - Not started: only a reset of financial data exists.
- [ ] Data region decided (EU or UK) or the transfer documented
  - Owner action: EU West is decided (DECISIONS round 3), and `docs/runbooks/region-move.md` exists.
  - The move is not shown as done.
- [ ] FCA perimeter view obtained; bank connect off or covered; "guidance, not advice" on all projections
  - Owner action: the perimeter view (E29b).
  - Done: bank connect is owner-only (#414), and the guidance notice is in place (#417).
- [ ] No placeholder text in the production build; real company details, security contact and support mailbox
  - Owner action: the guard is built (#489, #526), but `packages/business-details` still holds placeholders.
- [ ] Custom domain live; cookie domain logic corrected; noindex removed deliberately
  - Owner action: the domain.
  - Done: the cookie logic is fixed (E20), and the launch-gated noindex switch is ready (#506).
- [ ] Pricing or free-beta position stated truthfully on the pricing page
  - Owner attestation pending: the page is done (#601) and `readiness.json` now points at it (BE-01).
- [x] Docker images build in CI, run non-root, and shared-package changes trigger a deploy
  - Done in #465 and #484, plus the watch patterns.
- [ ] axe passes on kept screens in light and dark; accessibility statement published
  - Not met: there is no accessibility statement, and the Storybook a11y job is advisory until 2026-11-25.
- [ ] Features marked cut by E16 are removed or flagged off, not merely hidden
  - Owner attestation pending: E16 PRs 1 to 8 merged (#399 to #410).

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
  - Done (engine PR): T5, `calculateUkTax` is an adapter over `computeUkTakeHome`; `calculateUKEWNITakeHome` and the other second implementations are deleted. T15, `scripts/check-one-tax-engine.ts` runs in `check:laws`.
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

- **Status (2026-11-20):** SUPERSEDED by E33, which keeps this epic's tax and withdrawal work as its slices S6 and S7 (see the E33 notes). The MoneyHelper pension line shipped in #770 (E33 RD11). UFPLS, inheritance tax on pensions from April 2027 and the self-employed saving gap are not started.
- **Severity:** P2.
- **Blocked by:** E4 vectors for pension tax rules; E29 for projection wording.
- **Done when:** projection shows contributions, tax relief, UFPLS and PCLS options, state pension and the effect of inheritance tax on unused pensions from 6 April 2027, with assumptions visible and editable; manual pension entry with links out to MoneyHelper, no dashboard connection claimed; self-employed saving gap shown for self-employed users.
- **Notes:** ProjectionLab already models UK UFPLS and PCLS, so Flump's angle is the link to take-home and the ledger, not scenario depth. Pensions Dashboards public launch is expected in FY2027-28 (UNVERIFIED), and third-party access is unlikely.
- **Labels:** needs-triage

## E28. MTD for Income Tax discovery spike

- **Status (2026-11-18):** desk research done in [E28-mtd-discovery.md](plans/E28-mtd-discovery.md) (Decisions: open). There is no decision and no user evidence yet (E30 plan, owner question O3), and the decision is due before April 2027. No "MTD-compliant" claim appears in the copy.
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

## E33. Retirement plan: a target the user sets, tracked each month

- **Severity:** P2 (owner request, 2026-11-15).
- **Blocked by:** E29a for projection wording, and E29b before anyone beyond the friends beta; signed tax vectors for the tax slices (S6, S7).
- **Done when:** a user can save a retirement age and a yearly target of their own (typed, or built from their budget entries); housing cost in retirement follows their saved housing details (a mortgage that ends, a mortgage that continues, or rent for life, each shown with the same weight); the Retirement page shows an estimated yearly income in today's money for three growth cases beside that target, with every assumption visible and editable; the pots that count are tracked month by month from the check-in; an MCP read tool and a simulate tool expose the same figures; no surface says what a user needs or should do.
- **Notes:** E27 keeps its number and becomes slices S6 and S7 of this epic (withdrawal tax, the tax-free lump sum, UFPLS, inheritance tax on unused pensions from 6 April 2027, the MoneyHelper link, the self-employed view). The plan recommends that the Retirement Living Standards stay off the page, as E16 decision D6 left them. Plan: [E33-retirement-plan.md](plans/E33-retirement-plan.md). Companion research: [E34-shared-finances-research.md](plans/E34-shared-finances-research.md) (couples) and [E35-encouragement-and-wellbeing.md](plans/E35-encouragement-and-wellbeing.md) (encouragement and wellbeing). The owner accepted decisions RD1 to RD11 (E33) and CD1 to CD10 (E34) as the plans recommend on 2026-11-17; the MoneyHelper link (RD11) and the sharing-screen help line (CD10) still need owner-approved wording.
- **Status (2026-11-17):** `S0` to `S5` merged (`#750`, `#758`, corrected by `#768`). `#770` delivers RD6 (one projection: the forecaster's what-if moved from Pension to the Retirement scenario on the engine projection, workplace contributions counted), RD9 (friends-beta gate: `BETA_OPEN` or `RETIREMENT_ALLOWED_USER_IDS`) and RD11 (MoneyHelper pension guidance line). Not re-checked on 2026-11-20 beyond the merged PR list. Remaining: the budget-built target's "changes" amount per line (S4), `S6`–`S9` (tax and withdrawal slices, inheritance tax, self-employed view, MCP evals, mobile and two-person views, gated by E29a/E29b).
- **Labels:** needs-triage

## E34. Shared finances for couples

- **Severity:** P2 (owner request, 2026-11-15). Slice C1 now; C3 onward after launch and the solicitor's view (CD9).
- **Blocked by:** none for C1. C2 needs C1. C3 needs C2 and a specialist charity's safety review (CD7). C3 to C5 need the owner's approval of the help line wording (CD10). C6 needs E33; C7 needs E17 and E12.
- **Done when:** each person keeps their own login and their own data; nothing is shared until its owner shares it (private by default, CD1); members are equal, with no administrator (CD4); a household has two people (CD5); either person can stop sharing or leave at once, without the other's agreement and without any message to the other person (CD6); nobody can lock the other out or delete their data; tax is always worked out per person; joint items count at the person's share in their own figures; a shared item reaches a partner's AI connection only if its owner opts in (CD8).
- **Notes:** the owner accepted CD1 to CD10 as recommended on 2026-11-17. The safety rules G1 to G10 in the plan are requirements. Slices: C1 joint marker and share on accounts, budget entries and housing for one user; C2 combine two person pictures in the engine; C3 household, invitation (Flump's own link, CD3), leave and the help line; C4 per-item sharing and the "Me / Household" switch; C5 shared budget, Breathing room and check-in; C6 retirement for two; C7 MCP `household` scope and mobile. Plan: [E34-shared-finances-research.md](plans/E34-shared-finances-research.md).
- **Status (2026-11-20):** C1 is merged: `Slice 1` (`#748`, engine joint-share helpers), `Slice 2` (`#757`, joint marking and share on accounts) and the rest of C1, joint marking on budget entries and housing and a property following its mortgage's share (`#773`). C2 to C7 have no PR.
- **Labels:** needs-triage

## E35. Encouragement and financial wellbeing

- **Severity:** P3 (owner request, 2026-11-15).
- **Blocked by:** owner decisions W1 to W9 in the plan. Set 3's shared goals need E34 (C3 onward).
- **Done when:** every feature is a net positive for the person's financial wellbeing and never aims at engagement (test W); every feature passes the five no-shaming tests N1 to N5 (no scores or ranks, no comparison with others, no loss-framed streaks, the action acknowledged and never the amount, the same warmth for every starting point including debt and renting); each feature has its own switch and honours reduced motion; benefit is measured only as the plan's section 7 sets out, and a feature is paused or removed under its stop rules.
- **Notes:** three option sets: Set 1 warm confirmations of finished actions; Set 2 goals that are the user's own at any size; Set 3 a calmer month, reminders the user asks for, and shared goals for couples. The plan recommends Set 1 first, with the section 4 guide additions either way. UX guidelines O7 and M5 (no celebratory animation on a financial event) still apply. Plan: [E35-encouragement-and-wellbeing.md](plans/E35-encouragement-and-wellbeing.md).
- **Status (2026-11-18):** `Set 1` (`#749`, no-shaming copy guardrails and warm confirmations) merged. Sets 2 and 3 have no PR yet.
- **Labels:** needs-triage

## E36. Security hardening before real production

- **Severity:** P1 before public launch (owner request, 2026-11-15); P2 for the friends beta.
- **Blocked by:** owner approval of the plan and its decisions SD1 to SD8 (not re-checked); the custom domain (E24) for passkeys and the security mailbox; an owner money decision for the external test.
- **Done when:** Bun and Renovate both wait seven days before taking a new release, with a documented urgent exception; laws keep `trustedDependencies` to an allowlist and every action pinned to a commit; each release has an SBOM and CI fails on a known high advisory; `SECURITY.md` and `security.txt` are published; MFA is required on the owner's and admins' accounts and passkeys are offered to users; the application runs under a database role with no schema rights; names and labels are encrypted at field level; the breach runbook has been exercised once; a crypto inventory exists and the edge's key exchange has been tested; prompt-injection tests cover every MCP read tool and the staged import; an external penetration test has run and its findings are fixed or accepted in writing.
- **Notes:** the plan starts from an inventory of what is already on main (frozen lockfile with scripts off, SHA-pinned actions, digest-pinned images, gitleaks, Semgrep, ZAP, AES-256-GCM bank tokens, the 72-hour step in the incident runbook) and lists only gaps. Dashboard settings and the test budget are owner-only. Plan: [E36-security-hardening-plan.md](plans/E36-security-hardening-plan.md).
- **Status (2026-11-20):** `Slice 1` (`#747`: 7-day Bun/Renovate gates, CI laws, `SECURITY.md`, `security.txt`) and `H2 & H5` (`#755`: SBOMs, failing `bun audit`, workspace `knip`, MCP prompt-injection suite) merged. The backend items slice H4 waited on are merged: `SEC-A` and `SEC-F` (`#738`), `BE-18` (`#752`) and `SEC-D` receipt encryption (`#753`). Remaining hardening items (MFA/passkeys, restricted DB role, remaining field-level encryption, breach drill, external pentest) have no PR yet.
- **Labels:** needs-triage

### Addendum to E19: portability

Add to E19 (opus review: effort S, so fold in rather than a new epic): full JSON and CSV export of every user-owned dataset, CSV import for users arriving from other apps, and an honest statement of what happens to user data if the service closes. Do not publish a "shutdown-proof" claim without a run-off plan.

## E37. Self-employed work tracking and invoice builder

- **Severity:** P2 (self-employed workflow).
- **Blocked by:** owner approval of the plan and its decisions D1 to D3.
- **Done when:** a user can set a default hourly rate, log itemised work entries (`date`, `description`, `hoursWorked`, `hourlyRate` pre-filled and overridable, `amount`) linked to a Self Assessment income source, group/filter unbilled entries into numbered draft/issued/paid/void invoices with client details and totals, export invoices via PDF/print and formula-safe CSV, and optionally sync paid invoices into Self Assessment `tax_records` with `If-Match` concurrency, UK GDPR export/deletion coverage, and zero advice strings.
- **Notes:** four slices (`S0` data model & pure engine calculations -> `S1` CRUD API -> `S2` Work log & Invoice Builder UI -> `S3` SA integration & PDF/CSV export). Plan: [E37-self-employed-invoicing-plan.md](plans/E37-self-employed-invoicing-plan.md).
- **Status (2026-11-20):** plan merged (`#759`); nothing built (`S0` to `S3` have no PR).
- **Labels:** needs-triage

## E38. User action friction & interaction-efficiency audit

- **Severity:** P2 (UX efficiency).
- **Blocked by:** none.
- **Done when:** a repeatable Playwright interaction-cost harness (`S0`) measures clicks, keystrokes, modal hops, and scroll/focus friction at `1280px` and `375px`, and slices `S1`–`S3` ship targeted friction reductions across budget, check-in, accounts, and Self Assessment while preserving WCAG 2.2 AA and advice-boundary rules.
- **Notes:** Plan merged (`#763`): [E38-interaction-efficiency-audit-plan.md](plans/E38-interaction-efficiency-audit-plan.md).
- **Status (2026-11-20):** `S0` merged (`#780`: the interaction-cost harness, its baseline and a warn-only CI job, `.github/workflows/interaction-cost.yml`). `S1`–`S3` have no PR.
- **Labels:** needs-triage

## E39. Mortgage affordability: estimates from your own figures

- **Severity:** P2 (owner request, 2026-11-18).
- **Blocked by:** owner decisions MA1 to MA12; E29a for the wording and the standing line; E29b before anyone beyond the friends beta.
- **Done when:** a user sees, from saved details and without retyping, what is left each month before housing; an estimated loan from a monthly payment and from an income multiple, each with every assumption visible and editable; payments at a rate and at plus or minus a chosen number of points, for a new loan, a saved mortgage and a fix that ends; all formulas live in `packages/finance-engine` with hand-worked tests; nothing is stored; no surface names a lender, says what a user can borrow, or judges their situation.
- **Notes:** slices S1 engine, S2 web (new page, one rate tool replacing `RemortgageShockSim`), S3 optional MCP. Stamp duty, shared ownership and new interest-only loans are out of version one. Plan: [E39-mortgage-affordability-plan.md](plans/E39-mortgage-affordability-plan.md).
- **Status (2026-11-20):** plan only (`#776`); nothing built.
- **Labels:** needs-triage

## E40. One home per value: system data audit and restructure

- **Severity:** P1 for slices 1 and 2 (wrong figures shown today, and one case that changes saved data); P2 for the rest (owner request, 2026-11-19).
- **Blocked by:** owner decisions 1 to 15 in the plan, each for the slice that names it. Slice 2 needs decisions 9 and 15. The tax changes in slices 2 and 7 need the owner's vector sign-off (E4).
- **Done when:** every stored fact about a user has one source of truth and every shared figure has one engine function, as listed in `docs/system/value-map.yaml`; a CI check fails when a stored value has no entry in that map, when an entry points at a missing file, or when a figure is computed outside its engine function; each of the 73 expected cross-page links in the map holds and has a test; no page puts a joint account's share into a form as the whole; the AI tools read the same picture as the pages and invent no value for a fact that is not saved; budget lines that repeat a saved fact are linked to it; buy-to-let details live on accounts and reach the Mortgage page and Self Assessment; the dead columns, endpoints and tables listed in the plan are gone.
- **Notes:** the audit found 19 links that hold, 8 that hold with a manual step, 14 duplicated and 32 broken, with ten root causes. Nine slices: 1 the value map and its checks; 2 wrong numbers today; 3 one assembler; 4 accounts as the home for homes and loans; 5 budget lines linked to saved facts; 6 pay and pension answers; 7 Self Assessment joined up; 8 browser state; 9 database housekeeping. Slices 1 and 2 can run together. E39 should start after slice 5, E37 should use slice 7's record link, and E12 should take its data model from the map after slice 4. Decision 10 confirms or amends E23 D-1-B (`GET /financial-picture`, never built). Audit: [system-2026-11/SUMMARY.md](system-2026-11/SUMMARY.md). Plan: [system-2026-11/PLAN.md](system-2026-11/PLAN.md). Map: [docs/system](../system/README.md).
- **Status (2026-11-20):** DONE in code; all nine slices are merged: 1 the value map and its check (`#784`), 2 wrong numbers today (`#785`), 3 one assembler (`#786`), 4 accounts as the home for homes and loans (`#791`), 5 budget lines linked to saved facts (`#798`, `#803`), 6 pay and pension answers (`#797`, `#801`), 7 Self Assessment joined up (`#825`), 8 browser state (`#806`), 9 database housekeeping (`#805`, `#808`, `#820`), with follow-up fixes (`#816`, `#821`). The 12 retired profile columns are dropped with a 30-day before-image (`#820`). The tax changes in slices 2 and 7 still need the owner's vector sign-off (E4).
- **Labels:** needs-triage

# Added 2026-11-16: Epics added after the handoff, and handoff notes

The E41 block below was added on 2026-11-19. The handoff notes after it were brought up to date on 2026-11-20.

## E41. Mutation testing and faster tests

- **Severity:** P2 (owner request, 2026-11-19).
- **Blocked by:** nothing for the first slices: the owner accepted all 13 decisions on 2026-11-19 (DECISIONS round 12). Tests that assert a tax figure still need the owner's tax vector sign-off. The kill-test slices wait for the E40 slices that rewrite the same files.
- **Done when:** Stryker (a tool that makes small deliberate faults in the code and checks that a test fails) runs on a schedule against `packages/finance-engine`, `packages/api-contract`, `packages/mcp`, the small packages, the backend's authorisation and validation code, and the logic in `apps/web` and `packages/ui`; each of those has a mutation score floor in a baseline file that may rise freely and is lowered only with sign-off; every surviving fault in the money code is either killed by a test with a hand-worked expected value or recorded with a reason; pull requests get an advisory report on the files they change; the suites that cannot be mutation-tested (stories, Playwright suites, migrations, style recipes, generated code) are listed with what covers them instead; a test-speed baseline is recorded and each speed fix shows a before and after figure with no test weakened.
- **Notes:** two workstreams. Mutation: M0 proof on one engine module, M1 scheduled run and ratchet, M2 engine kill tests, M3 contract, MCP and small packages, M4 backend guards and services, M5 web and UI logic, M6 close-out. Speed: P0 baseline, P1 browser install in CI, P2 backend files in parallel, P3 web and UI environment and setup, P4 slow files and isolation, P5 Turbo and CI shape. Measured on 2026-11-19: pull request CI took 2 to 9 minutes over six runs; the backend suite is the slowest Vitest run (281 seconds, files run one at a time); the "Install Chromium" step varied from 9 to 328 seconds. No outside service is used; the hosted Stryker dashboard is decision 6. Plan: [E41-mutation-testing-and-test-speed-plan.md](plans/E41-mutation-testing-and-test-speed-plan.md).
- **Status (2026-11-20):** in progress. Mutation: M0 (`#792`), M1 (`#800`, weekly run and score ratchet), M2 parts A and B (`#809`, `#822`) and M3 (`#832`, contract, MCP and the small packages) merged; M4 (backend guards and services) is in progress; M5 waits for the owner. Speed: P0 (`#794`), P1 (`#795`), P2 (`#813`), P3 (`#828`), P4 (`#819`) and P5 (`#823`) merged. The change to isolate the engine from the rest was withdrawn.
- **Labels:** ready

## E42. Marketing site restructure: the site mirrors the app

- **Severity:** P2 (owner request, 2026-11-20).
- **Blocked by:** the coordinator's word to start: the build is first in line once the work open on 2026-11-20 has merged (owner, 20 November 2026). Three follow-up points wait for the owner: the AI connection's "How to get it" wording, whether its page keeps the "Preview" label, and that the chosen headline's two full stops are allowed for the marketing home h1 only. The two data facts for the Security page wait for the owner to confirm download and deletion work in staging. Guard changes named in the plan need the coordinator's sign-off before they are made.
- **Done when:** the marketing site has a "Flump features" page (navigation label "Features"), an AI connection page and one page for each of the app's five navigation areas (Accounts, Budget, Pay, Savings and pension, Debt and borrowing), named as the app names them and checked against the app's labels by a test; the home page shows all five areas in one picture and carries the three messages (one whole view, simple for everyone, more detail for those who want it); top navigation is three links and the call to action, with no calculators link; the three calculators the owner kept (pay rise, two ways to pay off debts, mortgage overpayment or ISA) sit on the area page they belong to in a short form, the marketing calculators pages are gone with every old address redirected, and all eight calculators remain in the app; Retirement is described on the Savings and pension page as an estimate, with the MoneyHelper line; the AI connection is presented as a feature like the others, with wording that is true for a tester whose account has not been switched on; imports and bank connections are not sold; every claim passes the claims and copy guards and the owner has signed off the copy (E7).
- **Notes:** plan: [E42-marketing-site-restructure-plan.md](plans/E42-marketing-site-restructure-plan.md), with the inventory, gap list, site map, draft copy, constraints check and build slices in two pull requests. All copy in the plan is a draft. It would change the home h1 and five-band layout set by E16 PR 12, only with the owner's yes. Revised on 2026-11-20 after the owner's first read: eight home headline options, Retirement on the site (the owner superseded RD9), and calculators assessed one by one and taken out of the top navigation.
- **Status (2026-11-20):** plan written and revised three times. The owner answered all ten decisions on 2026-11-20: headline "All your money. One clear picture."; the page is "Flump features"; the AI connection is presented as a feature, access still by named account; calculators 1, 5 and 6 kept; the rest as recommended. Retirement is open and in the app's navigation on `main`. An independent opus review of the first revision was done and its findings applied; the later revisions await review. Nothing built.
- **Labels:** needs-owner

## 1. The merge-queue PRs from the 2026-11-16 handoff

All of them have merged: #761, #762, #764, #765 and #766 (UX Batches A to D and the signed-in footer) and the release PR #760. Open pull requests change daily; run `gh pr list --state open` rather than reading a list here. On 2026-11-20 the only open pull request was #833 (the 2027/28 tax year, which needs the owner's tax sign-off).

## 2. UX Batch E

Merged in #777: the profile year of birth and pay, the check-in day, and the Self Assessment income sources and allowances. Not re-checked: whether each bullet of the original scope (the comparison card for expenses against the £1,000 allowance, and the `payslip` category question) shipped in full. The reminder email part still waits on E30 PR3 (the owner's email provider choice and a PECR opinion).

## 3. Planned epics and follow-up slices with no PR

- **E19 (Portability addendum):** JSON export and CSV export (`#754`) merged; CSV import and the shutdown run-off statement have no PR.
- **E33 (Retirement plan):** see the E33 status line. `S6` to `S9` and the per-line changed amount in S4 have no PR.
- **E34 (Shared finances for couples):** C1 is merged (`#748`, `#757`, `#773`). C2 to C7 (household, invitations, the "Me / Household" switch, partner safety and privacy controls) have no PR.
- **E35 (Encouragement and wellbeing):** `Set 1` (`#749`) merged; Sets 2 and 3 have no PR.
- **E36 (Security hardening):** `Slice 1` (`#747`) and `H2 & H5` (`#755`) merged; the remaining hardening items have no PR.
- **E37 (Self-employed work tracking and invoice builder):** plan merged (`#759`); `S0` to `S3` have no PR.
- **E38 (Interaction-efficiency audit):** `S0` merged (`#780`); `S1` to `S3` have no PR.
- **E39 (Mortgage affordability):** plan merged (`#776`); no build PR.

## 4. Stale local `.claude/worktrees/*`

Older local worktrees under `.claude/worktrees/` may hold leftover branches from earlier epics. Not re-checked on 2026-11-20. Check `origin/main` before assuming any of them represent unshipped work.
