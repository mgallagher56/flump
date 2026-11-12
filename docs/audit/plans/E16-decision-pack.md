# E16 owner decision pack

Pinned to main at `e4ff6c3`. Phases 0 to 3 only: documents and evidence, nothing built or cut. Interactive version: the HTML artifact (mark keep, fix, merge, demote, cut or add per row, then export). Detail: [E16-inventory.md](E16-inventory.md), [E16-scoring.md](E16-scoring.md), [E16-journeys.md](E16-journeys.md).

## Read this first

1. **A new user cannot finish onboarding on main, and no account can be edited.** Re-verified on a fresh database and a production build at origin/main (e4ff6c3): POST /accounts without currency returns 500, POST /budget-entries with title (the backend reads name) returns 500, and PATCH /accounts/:id returns 404 (only PUT is registered), which breaks Accounts, check-in, Pension, Debt and mortgage-rate edits. Fix before anything else (T-FIX-1).
2. **The product gives different answers to the same question.** One £112k salary shows 60% vs 62% marginal rate, £2,382 vs £5,916 vs £6,200 take-home, and £111 vs £231 safe-to-spend a week. Trust is the first problem, not features.
3. **Region, age and student-loan plan are never stored** (about 11 onboarding fields are dropped), so Scottish and Plan 2 users get England, no-loan figures.
4. **The best experiences are the signed-out tools.** They answer with zero inputs. Keep them as the front door.
5. **Cut or demote about a third of the surface.** 9 rows are BLOAT-SLOP and 10 are NO VALUE; roughly 2,500 dead lines, a duplicate public home (2,881 lines), a duplicate Forecast page, and non-UK tax paths that return gross as take-home.
6. **Populated, the app breaks in different places.** With a £118k, 17-account persona: Home shows net worth -£210,070 (no property asset), safe-to-spend £0 vs £774 a week on Budget, the Plan 2 student loan is treated as a payable debt, the mortgage page needs a term that is never saved, and four years of tax records stack into one year. Debt, Pension and Savings are most valuable here. Month two has no history to show (snapshot history is empty).
7. **Add three things**: the Tax-year hub, a real monthly check-in with history, and CSV import; plus account deletion and export as compliance hygiene.

## Bucket summary

| Bucket | Rows | Meaning |
|---|---|---|
| MOST VALUABLE | 8 | F01, F02, F03, F04, F05, F07, F11, F31 |
| NICE-TO-HAVE | 15 | F06, F08, F10, F12, F13, F14, F15, F20, F24, F25, F32, F33, F35, F36, F39 |
| BLOAT-SLOP | 9 | F09, F17, F18, F19, F21, F22, F23, F26, F34 |
| NO VALUE | 10 | F16, F27, F28, F29, F30, F37, F38, F43, F44, F45 |
| ADD (proposed) | 3 | F40, F41, F42 |

Value paths (every kept feature should sit on one): **Tax-year hub** (F05, F06, F19, F20, F42), **Monthly check-in** (F02, F03, F04, F14, F15, F41), **Big decisions** (F07, F08, F10 to F13), **AI companion** (F31, F32). Orphans, and so cut candidates: F18, F22, F23, F34, F37, F38, F43, F44.

Proposed navigation (at most 6 top-level items, one manifest): Home, Tax year, Money (Accounts, Budget, Savings), Decisions (Debt, Mortgage, Pension), Tools, Profile and AI.

## Decision table (recommendation pre-filled)

| ID | Feature | Bucket | Value | Health | Cost | Populated | Recommended | Why |
|---|---|---|---|---|---|---|---|---|
| F01 | Onboarding baseline (3 steps) | MOST VALUABLE | 3.14 | 2.25 | 3 | same | **fix** | Fix first. Make Finish succeed, persist region, age and student-loan plan, cut to at most 6 required inputs. |
| F02 | Home dashboard KPIs and safe-to-spend | MOST VALUABLE | 4 | 2.75 | 3 | breaks | **fix** | Fix: derive take-home from one source, drop invented split, adopt KpiStrip. |
| F03 | Accounts and net worth (manual) | MOST VALUABLE | 3.43 | 3.5 | 3.33 | better | **keep** | Keep as foundation. Verify hydration in a production build. |
| F04 | Monthly balance check-in drawer | MOST VALUABLE | 4 | 2.75 | 4.33 | breaks | **fix** | Fix and promote. This is the only monthly habit loop; make it write history and show 'net worth up £N'. |
| F05 | £100k trap, salary sacrifice, employer NI | MOST VALUABLE | 4.43 | 2.5 | 2.67 | better | **fix** | Fix first (E4 vectors), one engine call, one surface, persist region and student loan. |
| F06 | UK take-home calculator (Forecast tab) | NICE-TO-HAVE | 3.14 | 3.25 | 3.67 | same | **merge** | Merge into the Tax hub with prefill from profile. |
| F07 | Debt payoff (avalanche vs snowball) | MOST VALUABLE | 4.14 | 3.5 | 3.33 | better | **keep** | Keep and promote; add to mobile nav; advice-boundary wording review. |
| F08 | UK debt instruments (0% cliff, overdraft, car balloon, student loan) | NICE-TO-HAVE | 3 | 3.25 | 3 | better | **keep** | Keep inside Debt; dedupe against the public tools. |
| F09 | Debt-to-wealth bridge card | BLOAT-SLOP | 2 | 2.75 | 3.33 | same | **merge** | Merge into the payoff outcome panel. |
| F10 | Mortgage tracker, LTV milestones | NICE-TO-HAVE | 3 | 2.25 | 2 | breaks | **fix** | Fix empty state; move maths to the engine. |
| F11 | Overpay vs invest decision (3 implementations) | MOST VALUABLE | 4.14 | 2.5 | 2.67 | breaks | **merge** | Merge to one engine function behind page, tool and MCP, prefilled from the user's data. |
| F12 | Remortgage shock simulator | NICE-TO-HAVE | 2.71 | 2.25 | 3.33 | breaks | **demote** | Keep inside Mortgage; engine maths. |
| F13 | Pension pots and forecaster | NICE-TO-HAVE | 3.43 | 2.75 | 2.33 | better | **keep** | Keep; move maths to the engine; fold QuickStartWizard into empty state. |
| F14 | Savings pots, AER, ISA allowance pill | NICE-TO-HAVE | 2.71 | 3 | 3.33 | better | **keep** | Keep; absorb the Forecast savings tab; engine maths. |
| F15 | Budget plan (categories, surplus) | NICE-TO-HAVE | 2.71 | 3 | 3.33 | breaks | **keep** | Keep plan-only; align safe-to-spend with Home. |
| F16 | Budget 'actuals' (MTD settled) | NO VALUE | 1 | 1 | 3.67 | same | **cut** | Remove until CSV import exists. |
| F17 | Budget setup wizard | BLOAT-SLOP | 1.43 | 3.5 | 3.67 | same | **merge** | Merge into onboarding and the empty state. |
| F18 | Runway calculator | BLOAT-SLOP | 2.43 | 2.5 | 3 | same | **demote** | Demote to one emergency-fund-months card in Budget. |
| F19 | Self Assessment ledger (tax records) | BLOAT-SLOP | 2.71 | 2.75 | 1.67 | breaks | **demote** | Demote to opt-in module (default on for self-employed or rental income). |
| F20 | Section 24 landlord tax | NICE-TO-HAVE | 3.29 | 3.75 | 4.33 | same | **keep** | Keep as a tool and inside the Tax module. |
| F21 | Forecast route (as its own page) | BLOAT-SLOP | 1.71 | 2.75 | 3.67 | breaks | **merge** | Merge into Savings, Pension and a Tax hub; redirect /app/forecast. |
| F22 | Financial stage hero and health score | BLOAT-SLOP | 2.29 | 2.5 | 3.33 | breaks | **fix** | Hide until inputs are real, or cut. |
| F23 | Dashboard customisation (order, sizes, per-widget config) | BLOAT-SLOP | 1.71 | 4.25 | 3.67 | better | **demote** | Show or hide only. |
| F24 | Dashboard module widgets (8) | NICE-TO-HAVE | 3 | 2.75 | 3 | same | **demote** | Reduce to the core four; engine maths. |
| F25 | Setup checklist | NICE-TO-HAVE | 2.43 | 3.75 | 4 | same | **keep** | Keep; unify with onboarding. |
| F26 | Bank connect via personal token (Monzo, Starling, Trading212) | BLOAT-SLOP | 2.29 | 2.75 | 2.33 | same | **demote** | Demote to Advanced/beta. |
| F27 | Bank OAuth and open-banking providers | NO VALUE | 1 | 1 | 2.33 | same | **cut** | Flag off and delete (E6). |
| F28 | Synced transactions (stored, never shown on web) | NO VALUE | 1 | 2 | 2.67 | same | **cut** | Decide: show on account detail, or stop storing. |
| F29 | Account history editing | NO VALUE | 1.71 | 2.25 | 3.33 | same | **cut** | Remove the edit UI; history comes from the check-in. |
| F30 | Plaid and sandbox bank adapters | NO VALUE | 1 | 1 | 3.67 | same | **cut** | Delete. |
| F31 | MCP AI access (token card + server) | MOST VALUABLE | 4 | 1.5 | 2.67 | same | **fix** | Fix behind a preview flag after E1, or hide the card. T=1 gate: do not leave the fake minting visible. |
| F32 | Offline AI context pack (copy, .md, .json) | NICE-TO-HAVE | 3 | 3.25 | 4.33 | better | **keep** | Keep; lead with it until tokens work. |
| F33 | Public tools (7 calculators) | NICE-TO-HAVE | 3.71 | 3.75 | 4 | same | **keep** | Keep as the acquisition front door; fix the mortgage tool and CTA copy; add region. |
| F34 | Web signed-out home (duplicate of marketing) | BLOAT-SLOP | 1 | 3.25 | 2.67 | same | **cut** | Cut; send signed-out / to marketing. |
| F35 | Marketing site | NICE-TO-HAVE | 2.43 | 4.25 | 3.67 | same | **keep** | Keep as sole public home. |
| F36 | Demo sandbox | NICE-TO-HAVE | 2.14 | 3.75 | 4 | same | **keep** | Keep; trim fixtures. |
| F37 | Country selector (15 countries), Irish take-home | NO VALUE | 1 | 2 | 3.33 | same | **cut** | Cut. Force GB/GBP; keep columns. |
| F38 | Spanish locale / i18n layer | NO VALUE | 1 | 2.75 | 4.33 | same | **cut** | Cut, or leave dormant (owner decision D6). |
| F39 | Profile and settings (password, danger zone) | NICE-TO-HAVE | 2.14 | 4 | 3 | same | **keep** | Keep; split the panel; see F40. |
| F40 | Account deletion and data export | ADD (proposed) | 1.86 | 3 | 2.33 | same | **add** | Add (hygiene). Needs owner and legal review. |
| F41 | CSV import (statements, history) | ADD (proposed) | 3.71 | 2.5 | 3 | same | **add** | Add as top-3 candidate. |
| F42 | Tax-year hub (take-home, trap, sacrifice, SA, deadline) | ADD (proposed) | 4.43 | 2.5 | 2.67 | same | **add** | Add as top-3: one hub, fed by persisted region and student loan. |
| F43 | Childcare as a standalone calculator | NO VALUE | 1 | 1 | 3 | same | **cut** | Fold into trap copy or build a real check later. |
| F44 | Dead components (~2,500 LOC excluding the two law-compliant ones): scenario bar and store, ScenarioLayersWidget, WealthCheckHeroWidget, SavingsQuickStartWizard, PromoCliffTracker, FLPSlider, FLPSpinner, FLPTable, useDebtPayoffSchedule, AccountDetailsStyles, barrels | NO VALUE | 1 | 2 | 4 | same | **cut** | Cut. |
| F45 | Law-compliant dead components (PayoffStrategyControls, SandboxTemplates) | NO VALUE | 1.43 | 2.75 | 4.33 | same | **merge** | Adopt on Debt (D10-B) instead of deleting. |

Owner choice and notes: use the HTML artifact, then paste its Markdown export here or into `DECISIONS.md`.

## Draft execution tickets (phase 4 draft; nothing is built)

### T-FIX-1 (P0, S) Onboarding Finish 500s and every account edit 404s: web payloads do not match the backend (title vs name, missing currency, PATCH /accounts/:id unregistered)
- Rows: F01. Type: fix. Depends on: none (do first).
- Blast radius: routes/app.onboarding.tsx:339-356, account-intake.service.ts:97 (default currency), budget.controller.ts:277 (accept title or name), finance.controller.ts:130-131 (stacked @Put/@Patch: only PUT is registered), web PATCH callers in app.accounts._index.tsx, app.pension.tsx, app.debt.tsx, MortgageContainer.tsx. Add a web-to-backend contract test that posts the real payloads. No marketing or MCP impact.
- Success metric: Finish succeeds for 100% of valid submissions
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-FIX-2 (P0, M) Persist region, age, student-loan plan, housing, cash, pension pot
- Rows: F01,F05,F06. Type: fix. Depends on: E4 vectors signed off; migration backup pattern (E2 T6).
- Blast radius: user_profiles migration + entity + PATCH handler, userProfileToFinancialBaseline, onboarding, UserProfilePanel, every take-home/trap caller (PensionContainer, UKTaxCalculator, TaxTrapAlertBanner), MCP baseline, E4 vectors, E12 rows 1,2,15.
- Success metric: 0 figures reverting to default after reload; Scottish and Plan 2 vectors pass
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-FIX-3 (P1, M) One take-home and trap source of truth
- Rows: F02,F05,F06,F15. Type: fix. Depends on: T-FIX-2.
- Blast radius: HomeDashboard, ForecastWidget, UKTaxCalculator, PensionContainer, TaxTrapAlertBanner, BudgetDashboard safe-to-spend (£111 vs £231/wk); all call one engine function.
- Success metric: Surface-disagreement list is empty on the persona fixtures (CI test)
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-FIX-4 (P3, S) Optional hygiene: Accounts route pulls @flump/banking/server into the client bundle in the dev server (production build is fine)
- Rows: F03,F04,F26. Type: fix. Depends on: none.
- Blast radius: routes/app.accounts._index.tsx:1, accounts tests. If a prod build is fine, close as dev-only.
- Success metric: Add account and check-in work in `bun run build && start`
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-FIX-5 (P1, M) Check-in: batch writes, write a history row, show the delta
- Rows: F04. Type: fix. Depends on: D12.
- Blast radius: MonthlyBalanceCheckInDrawer, PATCH /accounts, account-details history (backend), Home KPI, E12 row 5.
- Success metric: Monthly check-in completed per active user
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-FIX-6 (P1, S) Mortgage empty state and public-tool CTA copy
- Rows: F10,F33. Type: fix. Depends on: none.
- Blast radius: MortgageContainer empty state; tools.$slug.tsx / packages/ui MortgageVsIsaCalculator CTA ('syncs your live balance... automatically'); claims test.
- Success metric: No £0 / 0% / 0 years panel; claims test passes
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-FIX-7 (P1, L) Populated-state correctness: property asset, savings not spending, safe-to-spend one definition, student loan out of payoff, overdraft in debt, term persisted, annual vs one-off tax records
- Rows: F02,F07,F10,F15,F19,F21,F22. Type: fix. Depends on: T-FIX-2, E4.
- Blast radius: HomeDashboard, BudgetDashboard, DebtContainer and debtSummary (student loan is income-contingent), engine PortfolioSnapshot (add a property asset type or a home value field), mortgage term column plus MortgageContainer save (returned 'Could not save'), TaxContainer frequency semantics and the TaxWidget year filter, ForecastContainer invented savings baseline. Needs persona fixtures with heavy data in CI.
- Success metric: Heavy fixture: no figure conflicts across Home, Budget, Debt, Tax; net worth includes property
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-MCP-1 (P1, M) MCP token card: wire to /mcp-tokens or hide; lead with context pack
- Rows: F31,F32. Type: fix. Depends on: E1 fail-closed auth (D-03); D8.
- Blast radius: McpConnectionCard (837), UserProfilePanel:980, /mcp-tokens, MCP guardrail resource (stale 2026/27, 67.5 vs 69.5), financial-audit tool invented defaults, McpPage claims.
- Success metric: Token created, listed and used for a first tool call in under 5 minutes
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-CUT-1 (P2, S) Delete dead components (about 2,500 LOC)
- Rows: F44. Type: cut. Depends on: none; avoid E8 a11y work on these files.
- Blast radius: GlobalBaselineScenarioBar + scenario.store, ScenarioLayersWidget, WealthCheckHeroWidget, SavingsQuickStartWizard, PromoCliffTracker, AccountDetailsStyles, FLPSlider, FLPSpinner, FLPTable, useDebtPayoffSchedule, 3 barrels, and their tests and stories. No routes, endpoints or marketing touched. WealthCheckHeroWidget holds the only web use of several engine exports (engine trim list).
- Success metric: Dead-code grep returns zero
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-CUT-2 (P2, S) Non-UK scope: country selector, Irish take-home, es locale
- Rows: F37,F38. Type: cut. Depends on: D6.
- Blast radius: UserProfilePanel.tsx:41-70,196-250, useFormatCurrency (en-GB only), engine IRELAND_* and calculateIrishTakeHome, i18n.ts and locale files (if D6 says so). Data: profile country/currency columns stay; migration forces GB/GBP for non-GB rows. E12 rows 15, 19b.
- Success metric: No take-home path returns gross as net
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-CUT-3 (P2, M) Remove the web signed-out home; send / to marketing
- Rows: F34. Type: cut. Depends on: D7; marketing links to /tools.
- Blast radius: components/home/* (about 15 components), routes/_index.tsx signed-out branch, LoggedOutHome and HomeHero tests, persistOnboardingSeed hand-off, tools links (footer, FeaturePillars), E7 T12 mirrors, E8 T07.
- Success metric: One public home; claims test covers it
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-CUT-4 (P2, S) Remove budget actuals and account history editing UI
- Rows: F16,F29. Type: cut. Depends on: D2, D12.
- Blast radius: BudgetDashboard MTD block, routes/app.accounts.$account.tsx actions (3 missing endpoints), AccountDetails edit UI and tests, docs/pages_and_features.md, E12 row 5.
- Success metric: No UI path that calls a missing endpoint
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-CUT-5 (P2, M) Bank OAuth, open-banking providers, Plaid and sandbox adapters, duplicate /auth/callback
- Rows: F27,F30. Type: cut. Depends on: D4; E6.
- Blast radius: open-banking-standard provider, getOAuthUrl, web app.accounts._index.tsx:77-103, packages/banking adapters, routes/auth.callback.tsx and test, backend finance.service default callback. Stored connections: error state already set by ClearBankTokens.
- Success metric: No code path that redirects a bank return to the WorkOS handler
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-MERGE-1 (P2, L) Forecast route into Savings, Pension and the Tax hub
- Rows: F21,F06,F14. Type: merge. Depends on: D5; T-FIX-3.
- Blast radius: app.forecast.tsx, ForecastContainer and test, ForecastWidget, pageConfig 'forecast' key plus profile enabledPages/dashboardWidgets migration, redirect /app/forecast, E12 row 12, marketing '5-year forecast' wording. Law: SimulatorSplitLayout, SliderField, KpiStrip on merged pages; stories light and dark.
- Success metric: No invented savings figure on any page
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-MERGE-2 (P2, M) Overpay vs invest: one engine function behind page, tool and MCP
- Rows: F11,F10,F12. Type: merge. Depends on: E4.
- Blast radius: components/mortgage/* local maths, utils/mortgagePayment.ts, packages/ui MortgageVsIsaCalculator, engine calculateMortgageVsIsa, MCP tool, E4 vectors, mortgage tests.
- Success metric: Page, tool and MCP agree on shared inputs (CI test)
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-MERGE-3 (P3, M) Fold DebtToWealthBridge, BudgetSetupWizard into their hosts; adopt PayoffStrategyControls on Debt
- Rows: F09,F17,F45. Type: merge. Depends on: D10.
- Blast radius: DebtContainer, PayoffStrategySwitcher replacement, BudgetContainer empty state, onboarding; SandboxTemplates into /sandbox. E8 T17.
- Success metric: Debt page uses the law primitives
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-DEMOTE-1 (P2, S) Self Assessment as an opt-in module
- Rows: F19,F20. Type: demote. Depends on: D3.
- Blast radius: DEFAULT_ENABLED_PAGES, onboarding step, TaxWidget, route guard (enabledPages has none today), E12 row 13. Stored tax records untouched; add export before any removal.
- Success metric: Module on only for self-employed or rental users
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-DEMOTE-2 (P3, S) Runway calculator to an emergency-fund card
- Rows: F18. Type: demote. Depends on: none.
- Blast radius: RunwayCalculator, utils/runwayStorage.ts, _index.tsx calculateRunwayStats import, Pricing 'emergency runway' wording.
- Success metric: -1,300 LOC
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-DEMOTE-3 (P3, M) Dashboard customisation to show/hide; reduce widgets to core four
- Rows: F23,F24. Type: demote. Depends on: D11.
- Blast radius: WidgetSettingsModal, DashboardWidgetCard, profile dashboardWidgetOrder/Sizes/Config columns (stop writing; drop later), local FV in 3 widgets, E12 row 19a.
- Success metric: Home loads core KPIs in one row
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-DEMOTE-4 (P3, S) Bank PAT connect behind Advanced / beta
- Rows: F26. Type: demote. Depends on: D4.
- Blast radius: Accounts UI, ConnectBankWizard, public copy per E7 D1.
- Success metric: n/a
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-IA-1 (P2, S) One route manifest for desktop nav, mobile drawer and bottom bar; Debt on mobile; Tools linked from the app
- Rows: F07,F33. Type: ia. Depends on: none.
- Blast radius: Header.tsx:38-85, MobileNavDrawer.tsx:75-94, MobileBottomBar.tsx:60-146, pageConfig.ts, nav tests; hidden pages need a route guard.
- Success metric: Every enabled page reachable on mobile in at most 2 taps
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-ADD-1 (P1, M) Account deletion and data export (UK GDPR hygiene)
- Rows: F40. Type: add. Depends on: owner/legal.
- Blast radius: Backend delete cascade over 8 entities, export endpoint, Profile danger zone, privacy copy, mobile. Needs owner and legal review (R=1).
- Success metric: Deletion completes and is verified in a test
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-ADD-2 (P1, L) Tax-year hub (take-home, trap, sacrifice, SA, 5 April checklist)
- Rows: F42,F05,F06,F19,F20. Type: add. Depends on: T-FIX-2, T-FIX-3, E4.
- Blast radius: New route, replaces Forecast take-home tab and trap duplicates, uses T-FIX-2 data. Spike first.
- Success metric: Trap view to sacrifice action rate; kill if under 10% of P2 users open it in 4 weeks
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.

### T-ADD-3 (P2, L) CSV import for history and actuals
- Rows: F41. Type: add. Depends on: D2, F28 decision.
- Blast radius: Wire CsvStatementParser to a route and UI, no transaction retention beyond aggregates (decide with F28), BudgetDashboard actuals, Pricing claim (return only when built).
- Success metric: Imports per active user; kill if under 20% of check-in users in 8 weeks
- Acceptance: failing test first, then the four checks (`bun run lint`, `check-types`, `test`, `build`); colocation, token and layout laws for any UI moved.


## Roadmap

| When | Tickets | Why |
|---|---|---|
| Now (after E2/E5 land on hotspots) | T-FIX-1, T-FIX-4, T-FIX-6, T-CUT-1, T-IA-1 | Unblock first run; delete dead weight; fix mobile nav |
| Next (after E4 vectors) | T-FIX-2, T-FIX-3, T-FIX-5, T-MCP-1 (after E1), T-ADD-1, T-ADD-2 spike, T-MERGE-2 | One set of numbers; persistence; AI preview |
| Then | T-CUT-2, T-CUT-3, T-CUT-4, T-CUT-5, T-MERGE-1, T-DEMOTE-1..4, T-ADD-3 | Shrink to the value paths; mobile v1 on the frozen list |
| Checkpoint | Re-score after 5 to 8 owner interviews and 4 weeks of instrumentation | Date it in the roadmap |

Sequencing: execution tickets touching `_index.tsx`, `app.onboarding.tsx`, `app.debt.tsx`, `HomeDashboard.tsx` or `TaxContainer.tsx` land after E2 and E5. Anything depending on tax maths waits for E4 vectors. E12 mobile feature screens (M4 onwards) wait for this decision pack and the inventory update.

## Metrics

| Metric | Definition | Events |
|---|---|---|
| Activation | Onboarding completed + a personalised insight viewed + at least 1 account within 24h | onboarding_completed, first_personal_insight_viewed, account_added |
| Time to first value | Median seconds from signup to first personalised insight; target under 180s, with at most 6 required inputs | signup_completed, first_personal_insight_viewed |
| Monthly returning planners (north star) | Users with an insight view or check-in in 2 consecutive months | monthly_checkin_completed, page_viewed |
| Trust | 0 fabricated or conflicting figures (CI guard); error-state rate | error_state_seen, surface-disagreement test |
| Feature breadth | Distinct value paths used per user | page_viewed, tool_used |
| MCP | Weekly tool calls from real tokens | mcp_token_created, mcp_tool_called |

Instrumentation stays first-party and server-side with an allow-list schema (no amounts, no free text), per plan section 7.

## Owner decisions (updated with evidence)

| ID | Decision | Options | Recommendation | Evidence update |
|---|---|---|---|---|
| D1 | Core job and positioning | A. UK tax and wealth planner on your own numbers, with an AI companion (recommended). B. All-in-one money manager. C. Calculators plus AI only. | **A** | Evidence: strongest value rows are trap, debt, overpay vs invest and MCP; budgeting is weakest (D=2). Unchanged. |
| D2 | Budget actuals | A. Plan-only now. B. Actuals from CSV import. C. Bank sync. | **A, then B** | Actuals are already unreachable (F16). Nothing writes them. |
| D3 | Self Assessment ledger | A. Default page. B. Opt-in module. C. Cut. | **B** | Scored BLOAT (value 2.7, cost 1.7). |
| D4 | Bank connection scope | A. PAT beta only. B. Hide all. C. Aggregator partner. | **A** | PAT value 2.3; OAuth has no working callback (mechanism found). |
| D5 | Forecast route | A. Keep. B. Merge with redirect. C. Rebuild as one plan page. | **B** | Shows invented £250/£375 savings figures. |
| D6 | Non-UK scope | A. Keep. B. Cut countries and Irish tax, keep es dormant. C. Cut all. | **B** | 13 of 15 countries get untaxed take-home. |
| D7 | Public surfaces | A. Both homes. B. Marketing owns the home; web hosts tools. C. Tools to marketing too. | **B** | Web home duplicates 7 marketing components. |
| D8 | MCP AI access | A. Finish as preview after E1. B. Hide. C. Cut. | **A (hide the fake card meanwhile)** | Fake token still minted; context pack works today. |
| D9 | Instrumentation | A. First-party server-side events. B. None. C. Third-party SDK. | **A** | Unchanged. |
| D10 | Dead law-compliant components | A. Delete. B. Adopt. C. Leave to E15. | **B** | Corrected: only PayoffStrategyControls and SandboxTemplates comply; PromoCliffTracker does not. |
| D11 | Dashboard customisation | A. Keep. B. Show/hide only. C. Fixed. | **B** | Unchanged. |
| D12 | Account history editing | A. Build endpoints. B. Remove UI, history via check-in. C. CSV. | **B now, C later** | Edit actions hit 3 missing endpoints (404). |
| D13 | Decision pack format | A. HTML + Markdown. B. Markdown. | **A** | Done. |
| D14 | Interviews | A. Owner runs 5 to 8 first. B. After. C. Skip. | **A for P1 to P3** | Walkthrough evidence cannot replace users. |
| D15 | NEW: mobile companion app scope | A. Include in E16 scoring. B. Leave to E12. | **B** | 17 backend routes, its own tax maths; not in the plan. |
| D16 | NEW: synced transactions | A. Show on account detail. B. Stop storing. C. Keep for MCP and mobile only. | **B or C (owner)** | Stored, never shown on web; privacy exposure. |
| D17 | NEW: priority of the account write bugs | A. Fix before any further E16 execution. B. Batch with E2. | **A** | Re-verified on fresh DB and a production build at origin/main: Finish returns 500, and every account edit (PATCH /accounts/:id) returns 404. |

## Limits of this review

- One reviewer's judgment; no usage data; the owner is the only real user. Interviews (D14) should precede cuts to any MOST VALUABLE candidate.
- Walkthrough covered Sam fully through the UI and Priya by data seeding; Gareth, Dan, Alex and the debt-stressed persona were not driven. The Accounts page did not hydrate in the dev server (dev-only); the production-build check showed the check-in opens but saving 404s.
- Competitor research (plan T1.2) was not done; D (differentiation) scores are from product knowledge and are unverified against dated sources.
- An independent fact-check of the scoring against the code is in [evidence/E16-review-factcheck.md](evidence/E16-review-factcheck.md).
