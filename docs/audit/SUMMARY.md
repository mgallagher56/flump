# Audit summary

Produced 2026-11-11 from audit tracks A to N (docs/audit/*.md), after Phase 0 and Phase 1. Read-only: no product code was changed.

## How far to trust this

- Track findings were written by Sonnet subagents. Every P0 and P1 finding then went to two independent Sonnet skeptics (one checking the claim is true, one checking severity). **All 64 P0/P1 findings survived; none were refuted.** Severities in this document are the post-verification ones. Where a track file lists a higher severity than the verified one (for example I-01 to I-03 and C-04 and C-05), this document uses the verified value.
- P2 and P3 findings (182 of 246) were not adversarially verified.
- The authentication findings (D-01, D-02) were also read directly in code by the lead auditor in Phase 1 before any subagent ran.
- The workflow's own synthesis agent could not write files, so this summary and EPICS.md were assembled by the lead auditor from the structured results, not by a subagent. Epic grouping below is the lead auditor's reading of the verified titles.

## Headline verdict

**Not shippable as is.** Identity can be forged on the backend and the MCP endpoint, mock sessions are reachable in production paths, every new user is seeded with fabricated accounts and a developer's personal rental ledger, income tax is wrong for earners above 100k, and the marketing and security pages promise things the product does not do. None of this needs new features to fix; it is mostly removing fallbacks, failing closed, and correcting numbers.

**Before anything else:** confirm whether production currently holds real users (the audit could not reach Railway or GitHub). If it does, the auth findings are live incidents, not backlog.

## Top 10 risks

1. **Forgeable identity everywhere** (D-01, D-02, D-03, D-04, G-03, B-01, F-01): unsigned JWTs are trusted, the literal `mock-session-token` authenticates, a missing `WORKOS_API_KEY` disables auth, the web app fails open to a shared mock session, MCP accepts mock and unsigned tokens, and the auth tests assert the bypasses.
2. **Cross-user writes and no input validation** (D-06, D-07, D-08, B-02, C-18): `deleteAccount` deletes transactions before checking ownership; raw bodies are spread into `save()`, allowing `id`/`userId` takeover.
3. **Fake data seeded into real users** (G-01, C-04, C-05, B-03): a GET creates fabricated accounts, a fake pension and a personal rental P&L, and a race duplicates them.
4. **Wrong tax results** (C-01, C-02, C-03, C-06, C-07, C-08, C-10, C-11, F-06): income tax understated above 100k, the 45% band starts at the wrong threshold, Gift Aid counted twice, stale Scottish, NI and student-loan tables, a flat 29% "tax due" on the dashboard.
5. **Unsafe production database and config** (D-10, C-19, A-01, B-04, N-01, N-02): `synchronize: true` with no migrations, TLS verification off, default DB password, no boot-time env validation.
6. **Bank token handling** (D-11, plus D-12 as P2): encryption falls back to a committed default key and ciphertext is returned to clients. A deleted `.env` with an `sk_test_` WorkOS key, client id, DB password and JWT secret is in git history; rotate anyway.
7. **Fabricated figures shown as real** (I-01, I-02, I-03): invented debts on the Debt page, a fabricated dashboard debt widget, budget actuals that are always 92% or 78% of budget.
8. **Backend outages look like empty accounts** (C-20, B-06, I-04): loaders swallow errors; the API base URL is repeated in 21 places.
9. **Marketing and security claims the code cannot honour** (M-06 to M-10, G-08, G-12, I-07): permanent erasure with no endpoint, FCA/regulated sync claims, a Pro plan and trial that do not exist, a security form that discards messages, an `npx @flump/mcp` instruction for a private package.
10. **Net worth, debt and forecast arithmetic** (C-13, C-14, C-15, F-02): overdrafts counted as assets, a 30-year payoff for unpayable debt, forecast double-spending debt payments, and a test that pins the wrong overdraft behaviour.

## Counts by track

| Track | Area                | P0     | P1     | P2      | P3     | Total   |
| ----- | ------------------- | ------ | ------ | ------- | ------ | ------- |
| A     | Tech debt           | 0      | 1      | 11      | 6      | 18      |
| B     | Architecture        | 1      | 5      | 10      | 2      | 18      |
| C     | Correctness         | 2      | 14     | 12      | 1      | 29      |
| D     | Security            | 4      | 5      | 9       | 3      | 21      |
| E     | Performance         | 0      | 0      | 13      | 3      | 16      |
| F     | Tests               | 1      | 5      | 8       | 2      | 16      |
| G     | Unfinished / mocked | 2      | 4      | 6       | 3      | 15      |
| H     | Design system       | 0      | 3      | 9       | 5      | 17      |
| I     | UX                  | 0      | 8      | 6       | 2      | 16      |
| J     | Accessibility       | 0      | 2      | 11      | 5      | 18      |
| K     | Data viz            | 0      | 0      | 9       | 5      | 14      |
| L     | Copy / i18n         | 0      | 0      | 11      | 4      | 15      |
| M     | Marketing / SEO     | 0      | 5      | 8       | 1      | 14      |
| N     | Infra / CI          | 0      | 2      | 14      | 3      | 19      |
|       | **Total**           | **10** | **54** | **137** | **45** | **246** |

## All verified P0 and P1 findings

Severity is post-verification. Effort: S under 1h, M under 1 day, L multi-day. Full evidence is in each track file.

| ID   | Sev | Effort | Title                                                                                                        | Location                                                                                   |
| ---- | --- | ------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| B-01 | P0  | M      | Authentication fails open at every layer of the web-to-backend path                                          | apps/web/app/utils/utils.ts:99-104; apps/web/app/services/backend-client.server.ts:71; app |
| C-02 | P0  | M      | tax-rules.ts and tax-calculator.ts start 45% at taxable 112,570, not 125,140                                 | packages/finance-engine/src/tax-rules.ts:1003-1013; tax-calculator.ts:634-686              |
| C-03 | P0  | S      | Gift Aid double counted in calculateUkTax                                                                    | packages/finance-engine/src/uk-tax.ts:356-392                                              |
| D-01 | P0  | M      | Backend accepts unsigned JWTs and trusts sub claim                                                           | apps/backend/src/auth/auth.guard.ts:30-43                                                  |
| D-02 | P0  | S      | mock-session-token and missing WORKOS_API_KEY disable authentication                                         | apps/backend/src/auth/auth.guard.ts:25-29,46-50                                            |
| D-03 | P0  | M      | MCP verifier: mock tokens, unsigned OAuth JWTs, optional aud/exp, scopes self-assignable                     | packages/mcp/src/auth/token-verifier.ts:81-89,135-185; apps/backend/src/mcp.controller.ts: |
| D-04 | P0  | M      | Web app fails open to shared mock session and sends mock-session-token                                       | apps/web/app/utils/utils.ts:97-104; root.tsx:35; app.tax.tsx:16; app.pension.tsx:21; app.p |
| F-01 | P0  | S      | Auth guard tests assert the authentication bypasses                                                          | apps/backend/src/auth/auth.guard.spec.ts:36-89; apps/backend/src/auth/auth.guard.ts:25,33- |
| G-01 | P0  | M      | New real users seeded with fake accounts, fake pension and the developer's personal rental ledger            | apps/backend/src/account-intake.service.ts:93-136; apps/backend/src/tax.controller.ts:40-7 |
| G-03 | P0  | M      | Mock and dev sessions live in production paths and can attach real users to shared mock identities           | apps/web/app/utils/utils.ts:99-104; apps/backend/src/auth/auth.guard.ts:25-27,46-49; ~28 w |
| A-01 | P1  | M      | TypeORM synchronize:true on every connection, no migrations                                                  | apps/backend/src/app.module.ts:54,75                                                       |
| B-02 | P1  | L      | No backend validation/DTO layer; PATCH handlers mass-assign request bodies                                   | apps/backend/src/tax.controller.ts:774,785,794; account-intake.service.ts:246; main.ts; pa |
| B-03 | P1  | M      | Tax controller seeds a real-looking personal rental P&L into every new user on a GET                         | apps/backend/src/tax.controller.ts:29-728; account-intake.service.ts:93-134; budget.contro |
| B-04 | P1  | L      | Schema managed by synchronize:true with no migrations, indexes or foreign keys                               | apps/backend/src/app.module.ts:54,55,75; apps/backend/src/entities/*.ts                    |
| B-06 | P1  | M      | Web swallows backend failures as empty data and repeats the API base URL in 21 places                        | apps/web/app/services/backend-client.server.ts:73-80; localhost:4000 fallback in 14 files  |
| B-07 | P1  | M      | Financial calculations re-implemented in mobile and web instead of using finance-engine                      | apps/mobile-companion/src/screens/{ForecastScreen.tsx:11-60,ProfileScreen.tsx:90-140,Mortg |
| C-01 | P1  | M      | EWNI income tax in uk-tax.ts wrong above 100k (understated up to ~5k)                                        | packages/finance-engine/src/uk-tax.ts:190-227                                              |
| C-04 | P1  | S      | New users seeded with fabricated accounts, duplicated by a race                                              | apps/backend/src/account-intake.service.ts:93-135; apps/web/app/services/backend-client.se |
| C-05 | P1  | S      | Tax records seeded with developer rental and ISA data, recurring forever                                     | apps/backend/src/tax.controller.ts:29-70                                                   |
| C-06 | P1  | S      | Scottish tax in uk-tax.ts uses 2024/25 bands and mixed bases                                                 | packages/finance-engine/src/uk-tax.ts:232-282                                              |
| C-07 | P1  | S      | Employer NI savings use 13.8%/9,100 for 2025/26                                                              | packages/finance-engine/src/uk-tax.ts:164-185                                              |
| C-08 | P1  | S      | Three diverging student loan tables                                                                          | uk-tax.ts:29-44; tax-rules.ts:99-108; debt-payoff.ts:628-642                               |
| C-10 | P1  | S      | A lone bonus record replaces the whole salary                                                                | packages/finance-engine/src/tax-calculator.ts:463-465                                      |
| C-11 | P1  | S      | Dashboard estimated tax due is a flat 29% of all records                                                     | apps/web/app/routes/_index.tsx:138-146                                                     |
| C-13 | P1  | M      | Unpayable debt gives a 30-year payoff date; interest saved estimate far off                                  | packages/finance-engine/src/debt-payoff.ts:259-262,388-402                                 |
| C-14 | P1  | M      | Forecast double spends debt payments; scenario deficits vanish                                               | packages/finance-engine/src/forecast.ts:73-87,116,164-167                                  |
| C-15 | P1  | S      | Overdrawn accounts treated as positive assets                                                                | packages/finance-engine/src/portfolio.ts:158-159; packages/banking/src/server/orchestrator |
| C-18 | P1  | M      | deleteAccount ordering, upsert-by-id and no validation (see Track D)                                         | apps/backend/src/finance.service.ts:67-70; tax.controller.ts:774-790; account-intake.servi |
| C-19 | P1  | M      | synchronize: true against production Postgres                                                                | apps/backend/src/app.module.ts:54,75                                                       |
| C-20 | P1  | M      | Web loader turns backend errors into an empty workspace                                                      | apps/web/app/services/backend-client.server.ts:73-81                                       |
| D-06 | P1  | S      | deleteAccount deletes transactions before ownership check                                                    | apps/backend/src/finance.service.ts:67-70                                                  |
| D-07 | P1  | M      | Raw request bodies spread into save(): id/userId takeover and cross-user writes                              | apps/backend/src/account-intake.service.ts:230-248; finance.service.ts:83-89; tax.controll |
| D-08 | P1  | L      | No server-side input validation; handlers take body: any                                                     | apps/backend/src/main.ts:8-12; tax.controller.ts:774,786; user-profile.controller.ts:66; m |
| D-10 | P1  | M      | TypeORM synchronize:true everywhere, TLS verification off, default DB credentials                            | apps/backend/src/app.module.ts:54-55,75,60-64                                              |
| D-11 | P1  | M      | Bank token encryption falls back to committed default key; ciphertext returned to clients                    | packages/banking/src/server/crypto.ts:7,13,90-99; apps/backend/src/finance.service.ts:91-9 |
| F-02 | P1  | S      | Test pins an overdrawn current account as a positive balance                                                 | packages/banking/src/server/orchestrator.test.ts:22-33; packages/banking/src/server/orches |
| F-03 | P1  | M      | @flump/mcp auth, scopes and anonymisation are essentially untested                                           | packages/mcp/src/mcp.test.ts:149-173; packages/mcp/src/auth/token-verifier.ts:80-188; pack |
| F-06 | P1  | M      | Finance-engine tests prove a value was computed, not that it is right                                        | packages/finance-engine/src/forecast.test.ts:5-66; mortgage.test.ts:13-18,52-72; tax-rules |
| F-07 | P1  | M      | Web route loaders/actions largely untested and excluded from coverage                                        | apps/web/app/routes/ (22 files export loader/action; tests only for _index, $feature._inde |
| F-11 | P1  | L      | No E2E, contract or cross-package integration layer                                                          | repo-wide (no playwright, cypress, supertest or contract tooling in package.json files or  |
| G-04 | P1  | M      | Account history editing on web and mobile calls non-existent endpoints                                       | apps/web/app/routes/app.accounts.$account.tsx:16-55; AccountDetailContainer.tsx:95-130; ap |
| G-06 | P1  | M      | MCP AI-connections card is a client-side fake                                                                | apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx:12 |
| G-08 | P1  | S      | Marketing promises Pro features, trial and CSV import with no implementation                                 | apps/marketing/src/pages/PricingPage.tsx:233,253,357,404,409-415                           |
| G-12 | P1  | S      | Security enquiry form discards message and reports it as sent                                                | apps/marketing/src/pages/SecurityPage.tsx:72-79,462-468                                    |
| H-01 | P1  | M      | Non-existent token names compile to invalid CSS (transparent cards, non-red error text)                      | apps/web/app/components/forecast/SavingsForecaster.tsx:89,126; UKTaxCalculator.tsx:134,171 |
| H-03 | P1  | L      | Raw hex/rgb colours across 91 web files; most map to existing semantic tokens                                | apps/web/app (components/budget 142 lines, tax 58, pension 54, home 45, dashboard/widgets  |
| H-08 | P1  | L      | Law 1 colocation gap: ~95% of web components flat; ordered migration plan                                    | apps/web/app/components, apps/web/app/containers, apps/marketing/src/{components,pages}    |
| I-01 | P1  | M      | Debt page invents four debts and hard-coded inputs for users without debt data                               | apps/web/app/containers/debt/DebtContainer.tsx:31-65,102,105-108,117-125,147-153           |
| I-02 | P1  | M      | Dashboard Debt widget and loader fabricate figures                                                           | apps/web/app/components/dashboard/widgets/DebtWidget.tsx:64-67; apps/web/app/routes/_index |
| I-03 | P1  | M      | Budget MTD Settled Actuals is always 92% or 78% of budget                                                    | apps/web/app/components/budget/BudgetDashboard.tsx:208-214,498-501,587-590; apps/web/app/t |
| I-04 | P1  | M      | Loaders swallow every error, so an outage looks like an empty account                                        | apps/web/app/routes (loaders), app._index.tsx:25                                           |
| I-06 | P1  | M      | Destructive actions without confirmation, and three different confirmation styles                            | AccountDetails.tsx onRemoveYear; AddEditAccountsDialog.tsx handleRemoveAccount; mobile Dis |
| I-07 | P1  | S      | Marketing promises that the product does not implement                                                       | apps/marketing pricing and home; apps/web/app/routes/signUp._index.tsx                     |
| I-08 | P1  | L      | Connect-bank flow asks for developer tokens, and the OAuth path looks non-functional                         | apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx                    |
| I-09 | P1  | L      | Simulator and dashboard layouts ignore the progressive disclosure laws                                       | apps/web/app/containers/{mortgage,pension,debt,tax}; HomeDashboard.tsx KPI row             |
| J-01 | P1  | S      | Dark-mode primary fails contrast for button text, hover and primary text                                     | packages/ui/src/tokens/index.ts:174-180; packages/ui/src/primitives/Button/Button.styles.t |
| J-06 | P1  | S      | Form field boundaries below 3:1                                                                              | packages/ui/src/tokens/index.ts:202-208; apps/web/app/components/core/inputs/input/FLPInpu |
| M-06 | P1  | S      | 'One-click permanent erasure ... purges all historical data' has no backing endpoint                         | apps/marketing/src/pages/SecurityPage.tsx:235-240,402; apps/marketing/src/components/Foote |
| M-07 | P1  | S      | FCA AISP and regulated bank-sync claims describe a live sync that does not exist; no FCA registration stated | SecurityPage.tsx:85-88,157-162,305; HomeFAQ.tsx:43; ComparisonMatrix.tsx:77; SecurityPriva |
| M-08 | P1  | S      | Pricing page sells a Pro plan and 14-day trial that no code implements                                       | apps/marketing/src/pages/PricingPage.tsx:233,253,329-332,357,369,409-415                   |
| M-09 | P1  | S      | Encryption and transport claims conflict with Track D and with the server's actual headers                   | SecurityPage.tsx:126,183-187; SecurityPrivacySection.tsx:124,191; Footer.tsx:81; apps/mark |
| M-10 | P1  | S      | MCP page tells users to run npx @flump/mcp but the package is private; remote endpoint not found deployed    | apps/marketing/src/pages/McpPage/McpPage.tsx:262; McpSpotlightSection.tsx:87; packages/mcp |
| N-01 | P1  | M      | TypeORM synchronize:true unconditional; DB TLS verification disabled                                         | apps/backend/src/app.module.ts:54,55,75                                                    |
| N-02 | P1  | M      | No boot-time env validation; insecure fallbacks for missing variables                                        | apps/backend/src/app.module.ts:31,63; packages/banking/src/server/crypto.ts:7,13; apps/bac |

### Same root cause reported more than once

These are single pieces of work in the table above.

| Root issue                           | Finding IDs                                |
| ------------------------------------ | ------------------------------------------ |
| Authentication fails open            | D-01, D-02, D-04, G-03, B-01, F-01 (tests) |
| MCP token verification               | D-03, F-03                                 |
| Database schema and TLS              | D-10, N-01, C-19, A-01, B-04               |
| Env and secrets at boot              | N-02, D-11, D-12                           |
| Fake seeding on GET                  | G-01, C-04, C-05, B-03                     |
| deleteAccount and mass assignment    | D-06, D-07, C-18, D-08, B-02               |
| Loaders hide backend failures        | C-20, B-06, I-04                           |
| Fabricated UI figures                | I-01, I-02, I-03                           |
| Marketing claims                     | G-08, G-12, M-06 to M-10, I-07             |
| Tax tables and bands                 | C-01, C-02, C-03, C-06, C-07, C-08, F-06   |
| Hardcoded colours and missing tokens | H-01, H-03                                 |

## Quick wins (effort S, P0 to P2)

- [ ] **C-03** (P0) Gift Aid double counted in calculateUkTax
- [ ] **D-02** (P0) mock-session-token and missing WORKOS_API_KEY disable authentication
- [ ] **F-01** (P0) Auth guard tests assert the authentication bypasses
- [ ] **C-04** (P1) New users seeded with fabricated accounts, duplicated by a race
- [ ] **C-05** (P1) Tax records seeded with developer rental and ISA data, recurring forever
- [ ] **C-06** (P1) Scottish tax in uk-tax.ts uses 2024/25 bands and mixed bases
- [ ] **C-07** (P1) Employer NI savings use 13.8%/9,100 for 2025/26
- [ ] **C-08** (P1) Three diverging student loan tables
- [ ] **C-10** (P1) A lone bonus record replaces the whole salary
- [ ] **C-11** (P1) Dashboard estimated tax due is a flat 29% of all records
- [ ] **C-15** (P1) Overdrawn accounts treated as positive assets
- [ ] **D-06** (P1) deleteAccount deletes transactions before ownership check
- [ ] **F-02** (P1) Test pins an overdrawn current account as a positive balance
- [ ] **G-08** (P1) Marketing promises Pro features, trial and CSV import with no implementation
- [ ] **G-12** (P1) Security enquiry form discards message and reports it as sent
- [ ] **I-07** (P1) Marketing promises that the product does not implement
- [ ] **J-01** (P1) Dark-mode primary fails contrast for button text, hover and primary text
- [ ] **J-06** (P1) Form field boundaries below 3:1
- [ ] **M-06** (P1) 'One-click permanent erasure ... purges all historical data' has no backing endpoint
- [ ] **M-07** (P1) FCA AISP and regulated bank-sync claims describe a live sync that does not exist; no FCA registration stated
- [ ] **M-08** (P1) Pricing page sells a Pro plan and 14-day trial that no code implements
- [ ] **M-09** (P1) Encryption and transport claims conflict with Track D and with the server's actual headers
- [ ] **M-10** (P1) MCP page tells users to run npx @flump/mcp but the package is private; remote endpoint not found deployed
- [ ] **A-03** (P2) Committed coverage reports and tsbuildinfo files
- [ ] **A-04** (P2) Vulnerable transitive deps and pinned zod in @flump/mcp
- [ ] **A-06** (P2) TypeScript 7.0.2 plus an unreferenced @typescript/typescript6
- [ ] **A-07** (P2) Web coverage thresholds in wrong config key, enforce nothing
- [ ] **A-16** (P2) Lint hygiene: CI lint writes fixes, 128 warnings
- [ ] **B-11** (P2) finance-engine is not purely computational: browser persistence and clock reads
- [ ] **B-15** (P2) Package boundaries are convention only; nothing enforces them and packages/common is an orphan
- [ ] **C-17** (P2) Failed provider balance call writes balance 0
- [ ] **C-23** (P2) Section 24 calculator hardcoded, no taper
- [ ] **C-25** (P2) Date arithmetic and timezone handling
- [ ] **D-12** (P2) Real-looking WorkOS API key committed to git history
- [ ] **D-13** (P2) Password endpoints lack re-authentication; reset email to arbitrary address
- [ ] **D-15** (P2) Marketing CSP allows any https script; 500 handler leaks stack traces
- [ ] **D-16** (P2) Web session handling: dead session.server.ts, duplicate callbacks, GET logout, token exposed to JS
- [ ] **E-01** (P2) 1.35 MB 1024x1024 PNG rendered at 50x50 in the header of every page
- [ ] **E-11** (P2) Turbo and CI: build cache keyed on tests and stories, coverage always on, tracked outputs
- [ ] **E-12** (P2) rollup-plugin-visualizer always emits stats.html into the public client output
- [ ] **E-14** (P2) Marketing server reads the template sync per request, renders sync, and sets no explicit asset cache headers
- [ ] **F-15** (P2) Committed coverage reports are stale and misleading
- [ ] **G-05** (P2) Open-banking-standard providers unproven and copy claims all UK banks, FCA, PKCE
- [ ] **G-07** (P2) Dead mock code in banking package (Plaid, sandbox, orchestrator generators)
- [ ] **H-02** (P2) Body background set from undefined CSS variable
- [ ] **H-07** (P2) Dark-mode primary and destructive buttons fail AA; tests do not cover them
- [ ] **J-03** (P2) Tax records can only be edited by clicking the table row
- [ ] **J-04** (P2) Two dialogs have no accessible name
- [ ] **J-05** (P2) Focus outline removed with no visible replacement on several controls
- [ ] **J-08** (P2) Form errors not associated with fields; error colour token does not exist in source
- [ ] **J-09** (P2) Click handlers on non-interactive elements without keyboard path
- [ ] **J-13** (P2) Sticky header and fixed bottom bar with no scroll padding (focus not obscured risk)
- [ ] **K-03** (P2) Semantic colour misuse: red for Interest Saved; colour meaning flips
- [ ] **K-06** (P2) Axis and grid colours fall back to recharts defaults in four charts
- [ ] **K-07** (P2) Inconsistent axis and tooltip number formatting; no tabular-nums
- [ ] **K-10** (P2) Mobile balance bars clamp small values and drop the sign
- [ ] **L-02** (P2) Absolute and guarantee language on mortgage, overdraft and MCP claims
- [ ] **L-03** (P2) Regulatory status claims inconsistent and possibly misleading
- [ ] **L-05** (P2) Deprecated and banned names still shipped in visible copy
- [ ] **L-06** (P2) Terminology inconsistent for the same concept; GLOSSARY.md has no user-facing terms
- [ ] **L-07** (P2) Title Case and US spellings in labels, messages and mobile app
- [ ] **M-01** (P2) Static <title>Flump Finance</title> precedes the Helmet title in every SSR response
- [ ] **M-02** (P2) No robots.txt or sitemap.xml; missing files return the home page with 200
- [ ] **M-04** (P2) Alias tool slugs render the correct calculator under the tax-trap title, h1 and canonical
- [ ] **M-11** (P2) MCP 'strict PII anonymisation' is narrower than described
- [ ] **M-12** (P2) Inline theme script has no nonce, so the production CSP likely blocks it
- [ ] **M-13** (P2) Home FAQ answers are not in the SSR HTML
- [ ] **N-03** (P2) bun run lint uses --write so CI cannot fail on formatting; warnings never gate
- [ ] **N-04** (P2) Coverage thresholds are dead config; critical packages have none
- [ ] **N-06** (P2) .dockerignore lacks .env*, coverage, docs, mobile app
- [ ] **N-07** (P2) Docker images never built in CI
- [ ] **N-09** (P2) Conventional commits not enforced though release-please depends on them
- [ ] **N-10** (P2) Generated artefacts tracked; packages/common is only a stale coverage dir
- [ ] **N-12** (P2) README materially out of date
- [ ] **N-13** (P2) CI hygiene: tag-pinned actions, third-party action with write token, broad permissions, no timeouts, no Node pin

## E1 status

Epic E1 (real authentication and authorisation) is implemented on branch `worktree-e1-auth-fail-closed` (12 commits from ad4cd80, local, not pushed). Fixed on the branch: D-01, D-02, D-03, D-04, G-03, B-01, F-01 (guard tests replaced), D-06, D-07, plus tax-record and transaction ownership holes found during the work. F-03 (MCP tests) is only partly addressed. Not done and still open: D-08 and B-02 (a full validation layer), the issuer must be confirmed against a real WorkOS token before first deploy, and the follow-up tickets listed in the E1 final review.

## Proposed epics

Details, scope and ticket lists are in [EPICS.md](EPICS.md).

| Epic | Theme                                                 | Sev   |
| ---- | ----------------------------------------------------- | ----- |
| E1   | Real authentication and authorisation, fail closed    | P0    |
| E2   | Remove mocks and fabricated data from product paths   | P0/P1 |
| E3   | Secrets, config and database safety                   | P1    |
| E4   | Tax and money correctness                             | P0/P1 |
| E5   | Honest failure states and one API client              | P1    |
| E6   | Unfinished integrations: finish, flag or delete       | P1    |
| E7   | Marketing and security claims vs reality              | P1    |
| E8   | Accessibility AA                                      | P1/P2 |
| E9   | Adopt packages/ui in apps/web and colocate components | P1    |
| E10  | Emotion to Panda, dead code and tech debt             | P2    |
| E11  | Test and CI gates                                     | P1    |
| E12  | Mobile companion: finish or park                      | P1/P2 |
| E13  | Performance                                           | P2    |
| E14  | Copy, i18n and data-viz polish                        | P2    |

Large enough to need a decision map first (project `wayfinder` skill): **E9, E6, and E12 if it is to be finished.** Decisions worth a `grill-with-docs` session: the auth model (WorkOS session to backend), money representation (integers vs floats), a single canonical tax-year API, whether web adopts packages/ui or the design laws are relaxed for web, seed and demo-mode policy, bank-connect scope, the mobile app's fate, i18n scope.

## Recommended sequencing

**Sprint 0 (days, before any release):** confirm production exposure; rotate the WorkOS key, client id, DB password and JWT secret found in git history; fail closed on auth in backend, MCP and web (E1, test-first, replacing the tests that assert the bypass); disable `synchronize` outside local dev and require the bank-token key at boot (E3); take down or reword the marketing claims that are false today (E7 quick wins).

**Sprint 1:** stop seeding fake data and delete the mock fallbacks from read paths (E2); fix `deleteAccount` and add validation DTOs plus mass-assignment guards (E1/E3); tax and money engine fixes with test vectors written first (E4); errors no longer rendered as empty workspaces (E5).

**Sprint 2:** CI gates (coverage thresholds, audit, env validation, law-enforcement scripts) (E11); contrast and focus fixes (E8 quick wins); decide web vs packages/ui and mobile's fate, then plan E9, E12 with `wayfinder`; unfinished integrations triaged per Track G (E6).

Later: performance, Emotion removal, copy and i18n, remaining accessibility.

## Verified-down severities

Verification lowered these from the severity the track file first gave:

- D-12: P1 to P2 (Real-looking WorkOS API key committed to git history)
- J-02: P1 to P2 (Hardcoded status hex colours used as text fail on light backgrounds)
- J-03: P1 to P2 (Tax records can only be edited by clicking the table row)
- J-04: P1 to P2 (Two dialogs have no accessible name)
- J-05: P1 to P2 (Focus outline removed with no visible replacement on several controls)
- J-14: P1 to P2 (Mobile companion app has zero accessibility metadata)
- F-04: P1 to P2 (No authorization (IDOR) tests, no guard integration test, no validation tests)
- F-05: P1 to P2 (Coverage denominators exclude unimported files; web thresholds not enforced)
- F-08: P1 to P2 (Storybook play() and a11y addon never run; light/dark is visual only)
- H-02: P1 to P2 (Body background set from undefined CSS variable)
- H-05: P1 to P2 (FLP* layer duplicates packages/ui; shared patterns unused on real pages)
- H-07: P1 to P2 (Dark-mode primary and destructive buttons fail AA; tests do not cover them)
- G-02: P1 to P2 (Bank OAuth connect has no callback handler; web fallback uses a placeholder client id)
- G-11: P1 to P2 (Mobile companion is a demo app with mock auth and sticky silent mock fallback)
- B-05: P1 to P2 (decimal columns have no transformer, so money arrives as strings while types say number)
- B-08: P1 to P2 (Banking has two parallel provider abstractions; the packaged one is unused in production)
- K-01: P1 to P2 (All charts hardcode hex series colours; chart.* tokens unused in web)
- K-02: P1 to P2 (Series identity is colour-only or unlabelled dash; red/green pairs with no legend)
- C-01: P0 to P1 (EWNI income tax in uk-tax.ts wrong above 100k (understated up to ~5k))
- C-04: P0 to P1 (New users seeded with fabricated accounts, duplicated by a race)
- C-05: P0 to P1 (Tax records seeded with developer rental and ISA data, recurring forever)
- C-09: P1 to P2 (Tax-year boundary, stale defaults and inconsistent fallbacks)
- C-12: P1 to P2 (Debt schedule double counts interest and mislabels principal)
- C-16: P1 to P2 (Net worth history has no carry-forward; duplicates add; silent defaults)
- C-17: P1 to P2 (Failed provider balance call writes balance 0)
- E-01: P1 to P2 (1.35 MB 1024x1024 PNG rendered at 50x50 in the header of every page)
- E-02: P1 to P2 (Bank sync runs sequential per-transaction queries inside the HTTP request)
- E-03: P1 to P2 (No indexes or relations on any entity)
- E-04: P1 to P2 (Tax receipts stored as base64 in the row and returned by every list query, loader and MCP )
- M-01: P1 to P2 (Static <title>Flump Finance</title> precedes the Helmet title in every SSR response)
- M-02: P1 to P2 (No robots.txt or sitemap.xml; missing files return the home page with 200)
- M-03: P1 to P2 (Soft 404s: unknown paths render home and unknown tool slugs render the first tool, status )
- L-01: P1 to P2 (Projection pages carry no 'not advice' framing; disclaimers on tax pages only)
- L-02: P1 to P2 (Absolute and guarantee language on mortgage, overdraft and MCP claims)
- L-03: P1 to P2 (Regulatory status claims inconsistent and possibly misleading)
- L-04: P1 to P2 (Mutation failures never reach the user; single generic 'Oops' crash page)
- I-01: P0 to P1 (Debt page invents four debts and hard-coded inputs for users without debt data)
- I-02: P0 to P1 (Dashboard Debt widget and loader fabricate figures)
- I-03: P0 to P1 (Budget MTD Settled Actuals is always 92% or 78% of budget)
- I-05: P1 to P2 (Onboarding saves fictional defaults as real data and hides failures)
- N-03: P1 to P2 (bun run lint uses --write so CI cannot fail on formatting; warnings never gate)
- N-08: P1 to P2 (Release path: shared package fixes cannot trigger a release or deploy)

Nothing was upgraded by verification. No finding was refuted.

## What the audit could not check

| Gap                                                                                                   | Follow-up                                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| No runtime or browser pass (tracks E, I, J, K were done by code and token analysis)                   | Run the apps, then Lighthouse, axe on every route (light and dark), keyboard and screen-reader walkthroughs, real web vitals |
| Storybook a11y violations and `play()` results not run (CI only builds stories)                       | Run the Storybook Vitest project and count violations                                                                        |
| Production exposure unknown: Railway and GitHub were not accessible                                   | Check deployment config, who can reach the backend and MCP endpoint, Renovate PRs                                            |
| P2/P3 findings not adversarially verified                                                             | Verify when each is scheduled                                                                                                |
| Tax and threshold values were checked by subagents against primary sources, not by a tax professional | Have a person with UK tax knowledge sign off the test vectors in E4                                                          |
| Gzip bundle sizes not measured                                                                        | Add a bundle report to CI                                                                                                    |
