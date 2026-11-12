# E16 feature inventory (phase 0)

Pinned to main at `e4ff6c3` (worktree branch claude/e16-product-review-e6b01a). Read-only. Detailed line-by-line evidence lives in:
- [evidence/E16-web-inventory.md](evidence/E16-web-inventory.md) (routes, LOC, dead code, nav, i18n, persistence)
- [evidence/E16-backend-engine-mcp-inventory.md](evidence/E16-backend-engine-mcp-inventory.md) (endpoints with consumers, engine exports, MCP, banking, data-dependency matrix, marketing claim map)

State key: **real** works end to end; **partial** works with a known gap; **mock** fabricated or demo by design; **stub** shell or calls missing endpoints; **dead** no non-test importer or unreachable; **not built** proposed.

## Summary counts

- real: 18
- partial: 13
- mock: 3
- stub: 2
- dead: 5
- claim-only: 1
- not built: 3

## Inventory (45 rows)

| ID | Feature | Area | State | Key files (LOC) | Persistence | Maths source | Depends on |
|---|---|---|---|---|---|---|---|
| F01 | Onboarding baseline (3 steps) | Activation | partial | routes/app.onboarding.tsx (1,320) | server (partial) + localStorage | engine + 1 local threshold | user-profile PATCH, /accounts, /budget-entries |
| F02 | Home dashboard KPIs and safe-to-spend | Home | partial | components/dashboard/HomeDashboard.tsx (902), routes/_index.tsx | server (widget config) | engine (calculateSafeToSpend) + invented 60/40 split | accounts, budget entries, profile |
| F03 | Accounts and net worth (manual) | Foundation | real | containers/accounts/* (2,451 LOC) | server | engine PortfolioSnapshot | /accounts, /portfolio-snapshot |
| F04 | Monthly balance check-in drawer | Monthly ritual | partial | components/accounts/MonthlyBalanceCheckInDrawer.tsx (306) | server (balance only, no history row) | none | PATCH /accounts/:id |
| F05 | £100k trap, salary sacrifice, employer NI | Tax planning | partial | PensionContainer.tsx (863), PensionForecasterCard (1,185), TaxTrapAlertBanner, UKTaxCalculator, tools/uk-100k-tax-trap | none (derived) | mixed: engine + local UK_QUALIFYING_UPPER=50270 | profile salary, pension %, region (missing) |
| F06 | UK take-home calculator (Forecast tab) | Tax planning | real | components/forecast/UKTaxCalculator.tsx (744) | none | engine | baseline localStorage |
| F07 | Debt payoff (avalanche vs snowball) | Debt | real | containers/debt/* (2,584 LOC) | server | engine | accounts of type debt |
| F08 | UK debt instruments (0% cliff, overdraft, car balloon, student loan) | Debt | real | UkDebtInstrumentsCard.tsx (548) | none | engine | debt accounts |
| F09 | Debt-to-wealth bridge card | Debt | real | DebtToWealthBridgeCard.tsx (232) | none | engine | debt + surplus |
| F10 | Mortgage tracker, LTV milestones | Mortgage | partial | containers/mortgage/MortgageContainer.tsx (1,292), MortgageTracker (620) | server | local in all simulators; engine only for LTV | profile mortgage fields |
| F11 | Overpay vs invest decision (3 implementations) | Mortgage | partial | OverpayVsSaveCompare.tsx (598), packages/ui MortgageVsIsaCalculator (not engine), engine calculateMortgageVsIsa (MCP only) | none | three separate implementations | mortgage + savings |
| F12 | Remortgage shock simulator | Mortgage | real | RemortgageShockSim.tsx (289) | none | local | mortgage |
| F13 | Pension pots and forecaster | Pension | real | PensionForecasterCard (1,185), PensionAccountsList (638), PensionQuickStartWizard (590) | server | mixed + local compounding | pension accounts, profile |
| F14 | Savings pots, AER, ISA allowance pill | Savings | real | containers/savings/* (2,472 LOC) | server | local compounding | savings accounts |
| F15 | Budget plan (categories, surplus) | Budget | partial | containers/budget/* (2,730 LOC) | server | engine (safe-to-spend) | budget entries |
| F16 | Budget 'actuals' (MTD settled) | Budget | dead | BudgetDashboard.tsx:217-220,505 | n/a | none | actualMtdGbp (nothing writes it) |
| F17 | Budget setup wizard | Budget | real | BudgetSetupWizard.tsx (1,025) | server | none | seed-defaults |
| F18 | Runway calculator | Budget | partial | RunwayCalculator.tsx (1,236), utils/runwayStorage.ts (161) | localStorage only | local | budget |
| F19 | Self Assessment ledger (tax records) | Tax | real | containers/tax/* (4,364 LOC; TaxContainer 2,260) | server; receipts base64 | engine | /tax-records |
| F20 | Section 24 landlord tax | Tax | real | packages/ui Section24Calculator, MCP section24 tool | none | engine | BTL inputs |
| F21 | Forecast route (as its own page) | Forecast | real | containers/forecast/* (2,001 LOC) | none | local + engine | baseline |
| F22 | Financial stage hero and health score | Home | partial | evaluateFinancialStage in HomeDashboard; calculateFinancialHealthScore (no web consumer) | none | engine | baseline |
| F23 | Dashboard customisation (order, sizes, per-widget config) | Home | real | WidgetSettingsModal (125), DashboardWidgetCard (305), profile columns | server | none | profile |
| F24 | Dashboard module widgets (8) | Home | partial | dashboard/widgets/* (2,253 LOC) | server | local FV in Forecast, Savings, Mortgage widgets | all pages |
| F25 | Setup checklist | Home | real | SetupChecklist.tsx (363) | server steps + localStorage dismissal | none | profile |
| F26 | Bank connect via personal token (Monzo, Starling, Trading212) | Banking | partial | ConnectBankWizard (926), BankConnectionsList (314), backend providers | server (encrypted) | none | provider PATs |
| F27 | Bank OAuth and open-banking providers | Banking | dead | open-banking-standard.provider.ts, app.accounts._index.tsx:77-103 | n/a | none | /auth/callback |
| F28 | Synced transactions (stored, never shown on web) | Banking | dead | finance.controller.ts:145-150 | server | none | bank sync |
| F29 | Account history editing | Accounts | stub | routes/app.accounts.$account.tsx:19-39 | n/a | none | endpoints that do not exist |
| F30 | Plaid and sandbox bank adapters | Banking | mock | packages/banking/src/server/adapters/{plaid,sandbox}.ts | n/a | none | none |
| F31 | MCP AI access (token card + server) | AI | mock | McpConnectionCard.tsx (837), packages/mcp, backend mcp.controller | none (card), server (tokens) | engine | /mcp-tokens, E1 auth |
| F32 | Offline AI context pack (copy, .md, .json) | AI | real | GET /mcp-tokens/context-pack | none | engine | profile, accounts |
| F33 | Public tools (7 calculators) | Acquisition | real | routes/tools.$slug.tsx (474), packages/ui/src/calculators | none | engine, except mortgage tool | none |
| F34 | Web signed-out home (duplicate of marketing) | Acquisition | real | components/home/* (2,881 LOC) | localStorage + cookie | engine + local | marketing duplicate |
| F35 | Marketing site | Acquisition | real | apps/marketing/src | none | none | claims test |
| F36 | Demo sandbox | Acquisition | mock | routes/sandbox.tsx (252), utils/demoData.ts (602) | in memory | fixtures | none |
| F37 | Country selector (15 countries), Irish take-home | Profile | partial | UserProfilePanel.tsx:41-70,196-250; useFormatCurrency.ts | server | GB and IE only; 13 countries get gross as net | profile |
| F38 | Spanish locale / i18n layer | Profile | stub | i18n.ts, public/locales/{en,es} | n/a | none | none |
| F39 | Profile and settings (password, danger zone) | Profile | partial | UserProfilePanel.tsx (1,215) | server | engine | profile |
| F40 | Account deletion and data export | Compliance | not built | none | n/a | none | all entities |
| F41 | CSV import (statements, history) | Data in | not built | packages/banking CsvStatementParser (real, unwired) | n/a | none | parser |
| F42 | Tax-year hub (take-home, trap, sacrifice, SA, deadline) | Tax planning | not built | merges F05, F06, F19, F20 | server (region, student loan) | engine | profile columns |
| F43 | Childcare as a standalone calculator | Tax planning | claim-only | copy in tools.$slug.tsx:45-70, TaxTrapAlertBanner.tsx:131 | n/a | none | none |
| F44 | Dead components (~2,500 LOC excluding the two law-compliant ones): scenario bar and store, ScenarioLayersWidget, WealthCheckHeroWidget, SavingsQuickStartWizard, PromoCliffTracker, FLPSlider, FLPSpinner, FLPTable, useDebtPayoffSchedule, AccountDetailsStyles, barrels | Code | dead | see evidence/E16-web-inventory.md section 2 | n/a | WealthCheckHeroWidget holds the only web use of several engine exports | none |
| F45 | Law-compliant dead components (PayoffStrategyControls, SandboxTemplates) | Code | dead | features/debt/components/PayoffStrategyControls, features/sandbox/components/SandboxTemplates | n/a | none | SimulatorSplitLayout, SliderField, CollapsibleDrawer |

## Not in the plan's seed (found in phase 0)

- **Mobile companion** (`apps/mobile-companion`, Expo, 17 backend routes, own local `calculateUKTax` at `src/screens/ForecastScreen.tsx:11`). Not scored here; E12 owns it.
- **MCP**: 8 tools, 6 resources (plan said 4), 3 prompts. Guardrail resource hard-codes 2025/26 tax tables.
- **Engine barrel**: ~25 exports with no consumer outside the engine, and case-variant duplicates (`calculateUKTax`/`calculateUkTax`, `calculateEmployerNISavings`/`calculateEmployerNiSaving`).
- **Duplicate `/auth/callback`**: a byte-identical copy of the WorkOS handler that bank OAuth redirects to (mechanism of G-04/G-02).
- **Debt missing from the mobile drawer and bottom bar** while Tax has a permanent bottom-bar slot.

## Delta against the plan draft (state on this HEAD)

| Plan statement | On this HEAD |
|---|---|
| `?demo=true` branch at `_index.tsx:23-25` | Already redirects to `/sandbox`; one demo system |
| Onboarding pre-filled with fiction (I-05) | Fixed: fields start empty |
| Budget MTD actuals fabricated (I-03) | Gated, but nothing writes the value |
| Marketing claims (CSV, FCA, Pro, auto-categorisation) | Removed by E7; web home still has hard-coded metrics |
| `SavingsForecaster` shared by Savings and Forecast | Wrong: two separate implementations |
| `MortgageContainer` has local `/12` | Wrong: it is in the four simulators plus `utils/mortgagePayment.ts` |
| `RunwayCalculator` holds the maths | Wrong: it is in `utils/runwayStorage.ts` |
| `PromoCliffTracker` uses layout primitives | Wrong: only `PayoffStrategyControls` and `SandboxTemplates` do |
| 11 countries | 15 countries, 11 currencies |
| Data gap: ukRegion, studentLoanPlan, age missing | Confirmed, and wider: about 11 onboarding fields are dropped by the backend |
| MCP card fake token | Still true; copy now says "preview" |
