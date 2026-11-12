# E16 evidence: backend, engine, MCP, banking, calculators, data gap, claims (T0.2, T0.3, T0.4)

Worktree HEAD `e4ff6c3` (branch claude/e16-product-review-e6b01a). Read-only research; all paths relative to the worktree root. Counts come from `grep -w` over non-test sources, so a "none" means no non-test importer.

## 0. Delta against the plan draft (what this HEAD already changed)

The plan section 2 was written against an older tree. These items are stale or already fixed on HEAD:

| Plan statement | State on HEAD | Evidence |
|---|---|---|
| `?demo=true` branch at `_index.tsx:23-25` | Gone. Demo is `/sandbox` only (d292fdb, 62670c0) | `apps/web/app/routes/_index.tsx:38` comment; `isDemoMode` import still at `:10` (check for dead import) |
| Tax controller seed at `tax.controller.ts:46-758` | Gone. Controller is 142 lines; migration `RemoveSeededExampleData1794355400000` and `no-seed-data.spec.ts` exist | `apps/backend/src/tax.controller.ts` (142 lines), `apps/backend/src/migrations/` |
| Onboarding 1,228 lines, prefilled | 1,320 lines now; starts empty, Finish needs income, only filled fields create records (55ba225) | `apps/web/app/routes/app.onboarding.tsx` |
| Marketing claims (`PricingPage.tsx:203-404`: CSV import, FCA sync, auto-categorisation, Pro plan) | E7 removed them (6278f57, 32f9d2f, 16ae682). Pricing is "Free today" plus a disabled placeholder plan; `apps/marketing/src/claims.test.ts` bans regressions. Plan lines (`PricingPage.tsx:369`, `FeaturePillars.tsx:204`) no longer exist; file is 270 lines | `apps/marketing/src/pages/PricingPage.tsx:107-115,136-150,225-262` |
| Fabricated debts, wealth-check fallbacks, mortgage 150k/25y/4.5%, pension 45000, budget MTD actuals, home-loader invented figures | Fixed in aee0d4e, 3cda997, dbdb9b7, cf79d44, 1af60a4, 94ea8c2, 3852ac7, ae3db96, c4d8da3, 6166883, 2c6df88, 666564e | `rtk git log --oneline -40` |
| Dead components list | `WealthCheckHeroWidget` still exists but is now covered by a story and test; `features/debt/PayoffStrategyControls` and `SandboxTemplates` remain the only web users of `SimulatorSplitLayout`/`SliderField`/`CollapsibleDrawer` (confirmed by grep) | grep result |
| `userProfileToFinancialBaseline` fallback defaults | NOT fixed. `DEFAULT_FINANCIAL_BASELINE` still carries age 32, salary 45000, housing 900, other outgoings 1100, cash 5000, pension pot 15000, `ENGLAND_NI_WALES`, `NONE` | `packages/finance-engine/src/profile.ts:14-37` |
| Safe-to-spend | Still uses invented 60/40 split of living costs | `apps/web/app/components/dashboard/HomeDashboard.tsx:104` |
| MCP page "sample data" caveat | Added by E7 (preview wording), but the in-app token card is still a client-side mock | `apps/web/app/components/budget/UserProfilePanel.tsx:980` |
| `baseline.store.ts` key not user-scoped (G-10) | Still true | `apps/web/app/state/baseline.store.ts:14,32-40` |
| Onboarding region | Still absent; student loan plan collected but dropped by backend (details in section 2) | below |

Net: marketing honesty (E7) and web fabricated-figure removal (E2) have landed. The data-dependency gap (E4/E1 territory), MCP defaults and duplicated engine surface have not.

## 1. Inventory

### 1a. Backend endpoints (`apps/backend/src`)

All controllers use `@Controller()` with no global prefix except tax. Web consumer = `apps/web/app` (server loaders via `services/backend-client.server.ts` and route actions, plus hooks). Mobile = `apps/mobile-companion/src/api/client.ts`.

| Method and path | Entity | Source | Web consumer | Other consumer |
|---|---|---|---|---|
| GET `/` | none | `app.controller.ts:8` | `routes/ping.tsx` health | none |
| GET `/accounts` | Account | `finance.controller.ts:100` | `backend-client.server.ts:193`, routes accounts/pension/savings/debt | mobile `client.ts:336` |
| GET `/account-details` | AccountDetail | `:105` | `backend-client.server.ts:194` | mobile `:344` |
| GET `/accounts/:id` | Account | `:110` | `app.accounts.$account.tsx:56`, `MortgageContainer.tsx:129` | mobile `:511` |
| GET `/accounts/:id/details` | AccountDetail | `:115` | none (web reads `account.details` embedded) | mobile `:529` |
| GET `/portfolio-snapshot` | derived | `:120` | `backend-client.server.ts:200` | none |
| POST `/accounts` | Account | `:125` | `app.accounts._index.tsx:39`, debt/pension/savings routes | mobile `:471` |
| PUT/PATCH `/accounts/:id` | Account | `:130-131` | accounts/debt/pension/savings routes | mobile |
| DELETE `/accounts/:id` | Account | `:140` | accounts routes | mobile |
| GET `/transactions` | Transaction | `:145` | none | mobile `:352` |
| POST `/transactions` | Transaction | `:150` | none | none |
| GET `/bank-connections` | BankConnection | `:155` | `backend-client.server.ts:198` | mobile `:360` |
| POST `/bank-connections` | BankConnection | `:160` | `app.accounts._index.tsx:67` | mobile `:368` |
| POST `/bank-connections/:id/sync` | BankConnection | `:165` | none (web calls `/refresh`) | none |
| POST `/bank-connections/:id/refresh` | BankConnection | `:166` | `app.accounts._index.tsx:54` | mobile `:442` |
| DELETE `/bank-connections/:id` | BankConnection | `:171` | `app.accounts._index.tsx:58` | mobile `:458` |
| GET/PATCH `/user-profile` | UserProfile | `user-profile.controller.ts:60,65` | `root.tsx:41`, `useUserProfile.ts:288,369,376`, onboarding, profile route | mobile `:562,570` |
| POST `/user-profile/change-password` | UserProfile | `:70` | `useUserProfile.ts:314` | none |
| POST `/user-profile/update-password` | UserProfile | `:79` | none | none |
| POST `/user-profile/send-password-reset` | UserProfile | `:87` | `useUserProfile.ts:328` | none |
| POST `/user-profile/reset-financial-data` | UserProfile | `:93` | `useUserProfile.ts:341` | none |
| PATCH `/user-profile/checklist` | UserProfile | `:98` | `useUserProfile.ts:300`, `app.pension.tsx:151` | none |
| GET `/budget-entries` | BudgetEntry | `budget.controller.ts:201` | `backend-client.server.ts:196`, `BudgetContainer.tsx:153` | mobile `:586` |
| POST `/budget-entries/seed-defaults` | BudgetEntry | `:215` | `BudgetContainer.tsx:210` | none |
| POST `/budget-entries/categories` | UserProfile.customBudgetCategories | `:229` | `BudgetContainer.tsx:230` | none |
| POST/PATCH/DELETE `/budget-entries[/:id]` | BudgetEntry | `:259,293,330` | `BudgetContainer.tsx:168,183` | none |
| GET `/tax-records`, `/tax-records/:id` | TaxRecord | `tax.controller.ts:56,65` | `backend-client.server.ts:197`, `app.tax.tsx:43` | mobile `:594` |
| POST `/tax-records/bulk` | TaxRecord | `:75` | `app.tax.tsx:124` | none |
| POST/PATCH/DELETE `/tax-records[/:id]` | TaxRecord | `:107,117,132` | `app.tax.tsx:76,96,107` | mobile `:602,632,652` |
| POST/GET `/mcp` | none (transport) | `mcp.controller.ts:26,31` | none | external MCP clients only |
| GET `/mcp-tokens` | McpToken | `:39` | none | none |
| POST `/mcp-tokens` | McpToken | `:49` | none (card is mock) | none |
| DELETE `/mcp-tokens/:id` | McpToken | `:70` | none | none |
| GET `/mcp-tokens/context-pack` | derived | `:80` | none in web; `packages/mcp/src/transports/stdio.ts` CLI fetches it | stdio CLI |

Web calls with NO backend route (G-04 confirmed, still true on HEAD), all in `apps/web/app/routes/app.accounts.$account.tsx`:
- POST `/accounts/:id/details/year` (`:28`) - no route
- DELETE `/accounts/:id/details/:year` (`:21`) - no route
- PUT `/accounts/:id/details` (`:35`) - no route (backend has GET only, `finance.controller.ts:115`)
So history editing returns 404 from the backend; the action wraps it in `actionErrorResponse`.

Findings: endpoints with no web consumer are `/transactions` (mobile reads it, web does not), POST `/transactions`, `/bank-connections/:id/sync`, `/accounts/:id/details`, `/user-profile/update-password`, and all three `/mcp-tokens` CRUD routes. No account deletion, no data export, no budget reset route (plan section 2 listed `reset`; it is not in `budget.controller.ts`). Entities: account, account-detail, bank-connection, budget-entry, mcp-token, tax-record, transaction, user-profile (8).

### 1b. Engine exports (`packages/finance-engine/src/index.ts` re-exports 14 modules, 130 value exports)

Consumers searched: apps/web/app, packages/ui/src, packages/mcp/src, apps/backend/src (non-test). Only the interesting rows are listed.

Used by public calculators in `packages/ui` (the 7 tools): `calculateOverdraftCost`, `calculateTaxTrapRelief`, `calculateZeroPercentCliff`, `compareAvalancheAndSnowball` (via DebtSnowballCalculator), `evaluateUkStudentLoan`, `calculateSection24LandlordTax`, and `persistOnboardingSeed` (all 7). `MortgageVsIsaCalculator.tsx:1` imports only `persistOnboardingSeed`; its maths is NOT from the engine (see 1e).

Used by MCP: `calculateUkTax`, `calculateUKTax`, `calculateSection24Tax`, `calculateMortgageVsIsa`, `calculateMortgageAmortization`, `calculateDebtSchedule`, `compareAvalancheAndSnowball`, `calculateFinancialHealthScore`, `calculateForecast`, `evaluateFinancialStage`, `calculateSafeToSpend`, `calculateOverdraftCost`, `evaluateUkStudentLoan`, `filterConsumerDebts`, `buildFlumpAiContextPack`, `DEFAULT_FINANCIAL_BASELINE`.

Used by backend: `buildFlumpAiContextPack`, `formatAiContextPackMarkdown`, `userProfileToFinancialBaseline`, `PortfolioSnapshot` type.

Used by signed-in web (selection): `calculateUKEWNITakeHome` (3 files), `calculateEmployerNISavings` (4), `calculate100kTaxTrap` (PensionContainer.tsx:354), `calculateUkTax` (onboarding.tsx:209, home teaser), `calculateUKTax` (tax-rules; TaxContainer.tsx:259, plus a same-named local wrapper `UKTaxCalculator.tsx:704`), `calculateDebtSchedule`, `calculateAvalanche`, `calculateCarFinanceBalloon`, `calculateDebtToWealthBridge`, `calculateLtvMilestones`, `calculateMortgageAmortization`, `calculateSafeToSpend` (HomeDashboard.tsx:104, BudgetDashboard.tsx:155), `evaluateFinancialStage`, `calculateIrishTakeHome`, `calculateCompoundTrajectory`, `calculateSalarySacrificeSaving` (TaxTrapAlertBanner.tsx:64), `calculateTaxTrapRelief` (TaxTrapAlertBanner.tsx:49, WealthCheckHeroWidget).

No consumer outside the engine itself (candidates to trim or to wire): `analyzePromoCliff`, `projectCrossoverWealth`, `calculateClass4Ni`, `calculateEmployeeNi`, `calculateNationalInsurance`, `calculateScottishIncomeTax`, `calculateScottishIncomeTaxOnTaxable`, `calculateEwniIncomeTax`, `calculateStudentLoanDeduction`, `calculateStudentLoanRepayment`, `calculateSnowball`, `calculateMinimumOnly`, `calculateMonthlyMortgagePayment`, `calculatePersonalAllowance`, `sortDebtsByStrategy`, `getTaxYearRemainingDays`, `getMonthsForTaxYear`, `toMoney`, `roundPence`, the `IRELAND_*` tables, `UK_TAX_CONSTANTS`, `STUDENT_LOAN_THRESHOLDS`, `buildLegacyUKConfig`, and the storage drivers. Notably `calculateScottishIncomeTax*` has zero non-test callers anywhere outside `uk-tax.ts`/`tax-rules.ts`; Scotland is reachable only through `calculateUkTax({ region })` and `calculate100kTaxTrap(..., region)`, and no web caller passes a region.

Duplicate surface inside the engine (barrel exports both): `calculateUKTax` (tax-rules, SA oriented) vs `calculateUkTax` (uk-tax, take-home) vs `calculateUKTakeHome` vs `calculateUKEWNITakeHome`; `calculateEmployerNISavings` vs `calculateEmployerNiSaving`; `getCurrentUKTaxYear` vs `getCurrentUkTaxYear`; `calculateSection24LandlordTax` (ui) vs `calculateSection24Tax` (mcp); two rate-table sets (`tax-rules.ts` `UK_SCOTLAND_INCOME_TAX` at `:207-292`, `UK_STUDENT_LOANS` at `:540-610`, versus `uk-tax-year.ts` `getUkTaxYearRules`).

### 1c. MCP (`packages/mcp/src`)

8 tools (all via `server.registerTool`): `simulate_debt_payoff` (`debt-simulator.tool.ts:53`), `evaluate_cashflow_runway_and_health` (`financial-audit.tool.ts:18`), `evaluate_uk_student_loan` (`:142`), `query_transactions_and_spending` (`:185`), `project_wealth_scenario` (`life-events.tool.ts:61`), `compare_mortgage_overpay_vs_isa` (`mortgage-isa.tool.ts:56`), `calculate_self_assessment_and_section24` (`section24.tool.ts:45`), `simulate_uk_tax_and_pension_sacrifice` (`uk-tax-trap.tool.ts:49`).

5 resources: `flump://context/executive-snapshot`, `flump://context/baseline`, `flump://rules/uk-fiscal-guardrails` (`baseline.resource.ts:10,35,68`), `flump://context/accounts`, `flump://context/budget`, `flump://context/tax-ledger` (that is 6; plan said 4). 3 prompts: `uk-financial-health-audit`, `escape-100k-tax-trap`, `crush-high-apr-debt` (`prompts/uk-advisor.prompts.ts:10,38,63`).

Maths and constants outside the engine:
- `resources/baseline.resource.ts:68-123` hard-codes the whole guardrails document: Scottish bands (`:114-121`, 2025/26 values 2827/14921/31092/62430/125140), NI rates, student-loan thresholds, ISA/pension allowances, effective Scottish trap rate `67.5` (`:79`). It claims `taxYears: ["2025/26","2026/27"]` (`:70`) but the engine's 2026/27 Scottish bands differ (starter to 3967, `tax-rules.ts:287-292`), so the resource is stale for 2026/27. It should be generated from `getUkTaxYearRules`.
- Internal contradiction on the Scottish trap rate: prompt says 69.5% (`uk-advisor.prompts.ts:39`), resource says 67.5% (`baseline.resource.ts:79`), and the web tool copy gives 62% for EWNI incl. NI (`tools.$slug.tsx:55-56`, `McpSpotlightSection.tsx:162`).
- `financial-audit.tool.ts:60` invents take-home as `grossSalary/12 * 0.72`; `:55` invents housing 900 and other outgoings 1100; `:63` invents 5000 liquid savings. This is the same fabricated-defaults class that E2 removed from web.
- `life-events.tool.ts:159` local `/ 12` pension maths; `mortgage-isa.tool.ts:111` local `termMonths / 12`.
- `transports/stdio.ts:20-55`: when the API is unreachable the CLI silently serves `DEFAULT_FINANCIAL_BASELINE` (age 32, 45000 salary) and `queryTransactions()` returns `[]`. This is the source of the "tools run against baseline sample data" caveat on the MCP page.
- HTTP path (`apps/backend/src/mcp.service.ts:129`) does implement `queryTransactions` against the Transaction table, but nothing in web writes transactions except bank sync, so results are empty for manual-entry users.

### 1d. Banking

| Component | Status | Evidence |
|---|---|---|
| Monzo, Starling, Trading212 providers (PAT) | Real, wired in `BankProviderRegistry` | `apps/backend/src/providers/provider.registry.ts:20-23` |
| Open-banking-standard (HSBC, Barclays, Revolut, Santander, NatWest, Lloyds, Chase) | Registered as real providers but config-only URLs, no client registration, no callback route; unproven | `open-banking-standard.provider.ts:17-70`; web builds an OAuth URL with `callbackUrl = origin + "/auth/callback"` which is the WorkOS auth callback, not a bank callback (`app.accounts._index.tsx:77-103`) |
| `@flump/banking` Plaid adapter | Mock, unwired (nothing imports it outside the package barrel) | `packages/banking/src/server/adapters/plaid.ts`, `server/index.ts:3` |
| `@flump/banking` sandbox adapter | Mock, unwired | `adapters/sandbox.ts` |
| `@flump/banking` CSV parser (`CsvStatementParser`, `parseBankCsvContent`, Monzo/Starling/Amex/HSBC/generic detection) | Real and tested, unwired: no route, no UI import | `adapters/csv.ts:11,151,262` |
| `BankSyncOrchestrator` | Used only for token encrypt/decrypt/refresh and balance sign normalisation | `finance.service.ts:177,266,274,387` |

### 1e. Public calculators (`packages/ui/src/calculators`, 7 tools)

| Calculator | Engine function | Notes |
|---|---|---|
| TaxTrapCalculator | `calculateTaxTrapRelief` (`TaxTrapCalculator.tsx:27`) | England rates only, no region input; childcare is copy only |
| DebtSnowballCalculator | `compareAvalancheAndSnowball` (`:5`) | engine |
| ZeroPercentCliffCalculator | `calculateZeroPercentCliff` | engine |
| OverdraftCostCalculator | `calculateOverdraftCost` | engine |
| StudentLoanCalculator | `evaluateUkStudentLoan` | engine |
| Section24Calculator | `calculateSection24LandlordTax` | engine |
| MortgageVsIsaCalculator | none (imports only `persistOnboardingSeed`, `MortgageVsIsaCalculator.tsx:1`) | maths is local to the component; `calculateMortgageVsIsa` exists in the engine and is used only by MCP. This is the one public tool NOT engine-backed, contradicting the plan claim that all 7 are. Needs a closer look in phase 1. |

Web public tool pages: `apps/web/app/routes/tools.$slug.tsx` (TOOLS_DATA); marketing pages: `ToolPage.tsx`, `ToolsIndexPage.tsx`.

### 1f. Mobile companion (`apps/mobile-companion`, not in the plan inventory)

Expo app consuming 17 backend routes (list above). It has its own `calculateUKTax` in `src/screens/ForecastScreen.tsx:11` (local student-loan maths at `:43`), not the engine. Not mentioned in the plan; decide in/out of scope.

## 2. Data-dependency matrix (T0.4)

Fields `FinancialBaseline` needs (`packages/finance-engine/src/types.ts:25-49`) versus what is collected and stored.

| Baseline field | Onboarding input (`app.onboarding.tsx`) | Backend `user_profiles` column (`entities/user-profile.entity.ts`, baseline migration `:27`) | PATCH handler persists it (`user-profile.service.ts:262-318`) | `userProfileToFinancialBaseline` | Result for a signed-in user after reload |
|---|---|---|---|---|---|
| `ukRegion` | none (grep of onboarding for region/Scotland: 0 hits) | none | no | not read; inherited from default `ENGLAND_NI_WALES` (`profile.ts:17,33`) | always England/Wales/NI |
| `studentLoanPlan` | yes, select with "Plan 4 (Scotland)" (`:112,833-846`) | none | no (not in handler) | read `profile.studentLoanPlan` (`profile.ts:233`) but value is always null from backend | always `NONE` |
| `age` | yes (`:107,634`) | none | no | falls back to 32 | always 32 |
| `taxYear` | none | none | n/a | default `2025/26` | pinned to 2025/26 default in baseline; engine callers use `getCurrentUKTaxYear()` |
| `employmentStatus` | yes | `employment_type` | yes | mapped | OK (MIXED/OTHER lost) |
| `annualGrossSalary` | yes | `annual_salary` | yes | mapped | OK; if null falls back to 45000 |
| `monthlyTakeHomeOverride` | yes (computed) | `monthly_take_home` | yes | mapped | OK |
| `annualBonusOrSideIncome` | no | `second_income_monthly`, `rental_income_monthly` | yes | derived (x12) | OK |
| `housingStatus`, `monthlyHousingCost`, `monthlyOtherOutgoings` | yes | none | no | falls back to RENTING-or-MORTGAGE guess, 900, 1100 | invented |
| `totalCashSavings`, `totalPensionPot`, `totalUnsecuredDebt` | yes | none | no | falls back to 5000, 15000, 0 | invented |
| `propertyValue`, `mortgageBalance` | yes | none (only `has_mortgage`, BTL columns) | no | `Math.round(mortgageBalance*1.35)` or 0 | invented/zero |
| `pensionContributionPct`, `employerPensionMatchPct`, `isSalarySacrifice` | yes | `pension_percent`, `pension_employer_percent`, `is_salary_sacrifice` | yes | mapped | OK |
| `propertyOwnershipSharePct` | no | `property_ownership_share` | yes | mapped | OK |
| `financialStage`, `enabledModules` | yes | `enabled_pages` | yes | derived | OK |

The `UserProfileData` type (`profile.ts:46-100`) and web `UserProfile` (`useUserProfile.ts:32,155`) both declare `age`, `studentLoanPlan`, `housingStatus`, `monthlyHousingCost`, `monthlyOtherOutgoings`, `totalCashSavings`, `totalPensionPot`, `totalUnsecuredDebt`, `homeValue`, `mortgageBalance`, `mortgageRenewalDate`, but the backend entity has no column for any of them. The web sends them in PATCH (`app.onboarding.tsx:258-277`) and the backend silently drops them. This is wider than the plan's "no ukRegion, studentLoanPlan, age": about 11 onboarding fields are collected and discarded server-side.

Re-hydration path: `useUserProfile.setProfile` always calls `rawSetBaseline(userProfileToFinancialBaseline(normalized))` (`useUserProfile.ts:274-280`), overwriting the localStorage baseline with the server-derived one. So after a reload or on a second device, baseline fields revert to defaults. Within the same browser session the onboarding `updateBaseline` (`:282-305`) keeps the typed values until that overwrite.

### Verdict: do Scottish taxpayers and student-loan payers silently get wrong figures on signed-in pages?

**Yes.** Reasons with file:line:

1. There is no way to say you are Scottish. No region field exists in onboarding, the profile panel, the backend entity, or the PATCH handler (`ukRegion` appears in web only in the dead `GlobalBaselineScenarioBar.tsx:124`).
2. Every signed-in take-home or trap path is England/Wales/NI only:
   - `PensionContainer.tsx:258,265` `calculateUKEWNITakeHome` (no region, no student loan arg)
   - `PensionContainer.tsx:354` `calculate100kTaxTrap(salary, pct, sacrifice)` (region defaults to `ENGLAND_NI_WALES`, `uk-tax.ts:240`)
   - `UserProfilePanel.tsx:209` `calculateUKEWNITakeHome` (no student loan)
   - `UKTaxCalculator.tsx:704-731` wrapper hard-wired to EWNI
   - `TaxTrapAlertBanner.tsx:49` `calculateTaxTrapRelief(grossIncome)` (region default)
   - `app.onboarding.tsx:209` `calculateUkTax({ ... })` with no `region`, so the onboarding take-home that gets persisted as `monthly_take_home` is England-rate for Scots
   - Scottish engine functions have no web caller (section 1b).
3. Student loan: the plan is collected (`app.onboarding.tsx:264`) and used once for the live onboarding take-home, then discarded by the backend (no column, no handler line). Later pages never apply it; `PensionContainer.tsx:258-271` omit it; the Forecast `UKTaxCalculator` makes the user re-pick a plan by hand (`UKTaxCalculator.tsx:40`).
4. The Scottish trap rate and bands in MCP are separately hard-coded and inconsistent (section 1c).
5. Mitigation that exists: public tools and engine tests cover Scotland via `calculateUkTax({ region })`, but the tools have no region selector either (`TaxTrapCalculator.tsx:27`).

Also silently wrong for everyone after reload: age 32, housing 900, other outgoings 1100, cash 5000, pension pot 15000 (Section 0 delta), and safe-to-spend uses an invented 60/40 split (`HomeDashboard.tsx:104`). `baseline.store.ts:14` still uses one unscoped localStorage key.

## 3. Marketing claim map (T0.3)

Marketing pages: `apps/marketing/src/pages`, `components`. Web public home: `apps/web/app/components/home`. E7 cleaned the marketing app; the web copy of the same sections was only partly updated (it is not covered by `claims.test.ts`, which scans `apps/marketing/src` only).

| Claim | Where | Class | Evidence |
|---|---|---|---|
| Free planning tools, paid plan not priced, cannot be purchased | `PricingPage.tsx:136-150,225-262` | implemented (honest) | disabled button `:255-262` |
| "£100k–£125k tax trap and childcare calculator" | `PricingPage.tsx:108`; `ComparisonMatrix.tsx:83` (marketing) and `web/home/ComparisonMatrix.tsx:81`; `FeaturePillars.tsx` chip "30 hours free childcare" (~`:204`) | partial: trap calculator real, childcare is copy only | engine has no childcare logic; `tools.$slug.tsx:45-70` guide text; `TaxTrapCalculator.tsx:27` computes trap only |
| Debt avalanche vs snowball | `PricingPage.tsx:109`; `FeaturePillars.tsx:101` | implemented | `compareAvalancheAndSnowball` |
| 0% balance transfer payoff, alerts before 0% rates expire | `PricingPage.tsx:110`; `FeaturePillars.tsx:101-102` | implemented in tool; in-app alert exists | `DebtContainer.tsx:109,178-205` |
| Web home: "0% tracker with 60-day alerts and revert APR cost analysis" | `web/home/FeaturePillars.tsx:195` | partial: alert exists, no 60-day window found (`DebtContainer.tsx:109` filters `hasCliffRisk` only) | grep of 60-day logic: none |
| Section 24 calculator; beneficial-ownership splits | `PricingPage.tsx:111`; `web/home/FeaturePillars.tsx:251` | implemented | `calculateSection24LandlordTax`; `propertyOwnershipShare` in profile and `TaxContainer` |
| Mortgage overpay vs Stocks and Shares ISA | `PricingPage.tsx:112`; `FeaturePillars.tsx:318` | partial: the public tool does its own maths, MCP uses the engine function | `MortgageVsIsaCalculator.tsx:1` |
| LTV milestone tracker (75% vs 80%) | `web/home/FeaturePillars.tsx:235` | implemented | `calculateLtvMilestones` |
| Overdraft cost, student loan tools | `PricingPage.tsx:113-114` | implemented | engine-backed |
| "Safe to spend ... exact weekly allowance after ring-fencing" | `FeaturePillars.tsx:408`, HomePage:106 | partial: uses invented 60/40 split of living costs | `HomeDashboard.tsx:104` |
| "Know your net worth, weekly safe to spend, runway immediately from 6 rough numbers" | `HomeFAQ.tsx:58`, `HomePage.tsx:94-107`, `HowItWorksSection.tsx:198` | partial: onboarding collects more than 6; reload resets non-persisted fields | section 2 |
| "Flump has no feature to make payments or move money" | `HomeFAQ.tsx:46`, `SecurityPage.tsx:102,126`, `SecurityPrivacySection.tsx:207` | implemented (true; read-only providers) | providers only read |
| "Bank connection coming soon / not available" | `PricingPage.tsx` pending list, `SecurityPage.tsx:136`, `HomeFAQ.tsx:50` | consistent with reality for OAuth banks; but PAT connect for Monzo/Starling/T212 IS live in the app | `app.accounts._index.tsx:67` |
| "No bank logins, passwords or CSV imports needed" | `HowItWorksSection.tsx:103` | implemented (CSV not shipped) | csv parser unwired |
| Student loan plans 1, 2, 4, 5, Postgraduate | `HomeFAQ.tsx:54`; `McpPage.tsx:86` | implemented in engine and tool; not applied on signed-in pages (section 2) | partial for signed-in |
| "Built specifically for UK tax bands, Personal Allowance thresholds" | `FeaturePillars.tsx:58`, `HomePage.tsx:79` | partial: Scottish bands exist in the engine, unreachable from the product | section 2 |
| Pension auto-enrolment, qualifying earnings £6,240-£50,270, 3% employer match | `web/home/FeaturePillars.tsx:495`; marketing `ComparisonMatrix.tsx:85` | partial: figures appear in `PensionForecasterCard.tsx` and `demoData.ts`, not in the engine | grep `6240` |
| Live £20,000 ISA and £60,000 pension allowance countdown | `web/home/FeaturePillars.tsx:217`; `HomeHero.tsx:250` | partial: `AnnualAllowancePill` (savings) exists; pension countdown not verified | `components/savings/AnnualAllowancePill.tsx` |
| Hard-coded outcomes ("£1,480 & 16 months", "£5,020 / year", "+£48,200", "£420 / month", "+£28,000") | `web/home/FeaturePillars.tsx:196-258` | partial: illustrative figures presented as metrics; not computed | static strings |
| "Class 4 NI, Self Assessment hub, tax-year tracking" | `web/home/FeaturePillars.tsx:424-428` | implemented (SA ledger); Class 4 engine fn has no consumer, SA uses `calculateUKTax` | `TaxContainer.tsx:259` |
| "30-year compound trajectory simulating life events" | `web/home/FeaturePillars.tsx:272`; `McpPage.tsx:74` | implemented in MCP (`project_wealth_scenario`); web uses `calculateCompoundTrajectory` | |
| "Account aggregation with emergency runway stress testing" | `web/home/FeaturePillars.tsx:273` | partial: manual accounts plus PAT sync; "aggregation" over-claims | |
| MCP: 8 deterministic tools, results from `@flump/finance-engine`, same inputs same results | `McpSpotlightSection.tsx:67`; `McpPage.tsx:169-170` | implemented for tax/debt/section24; not for `evaluate_cashflow_runway_and_health` (invented 0.72, 900/1100/5000 defaults) | `financial-audit.tool.ts:55-63` |
| MCP tools run against baseline sample data (preview) | `McpPage.tsx:129-131,253,296` | accurate for the CLI; the HTTP endpoint reads real user data | `stdio.ts:20-55` vs `mcp.service.ts` |
| MCP rate limits 60 calls/min, 300/hr | `McpPage.tsx:216` | implemented | `rate-limiter.ts:22` |
| MCP tokens expire (90 days preselected), revocable from profile, record total tool calls | `McpPage.tsx:228-229,296` | no implementation in the UI: backend routes exist, but the profile card is not wired and mints a fake token client-side | `UserProfilePanel.tsx:980`, `McpConnectionCard.tsx:105-115` |
| MCP institution names replaced with generic labels by default | `McpPage.tsx:181`, `McpSpotlightSection.tsx:83` | implemented in backend flag `anonymizeInstitutions` (not verified end to end in this pass) | `mcp.service.ts` |
| MCP read-only hints on all tools | `McpPage.tsx:192` | implemented | annotations in each tool |
| MCP life events BUY_HOME, HAVE_CHILD, REMORTGAGE_SHOCK, EARLY_RETIRE_57 | `McpPage.tsx:74` | implemented | `life-events.tool.ts:11-15` |
| MCP Gift Aid reclamation | `McpPage.tsx:56` | implemented | `uk-tax-trap.tool.ts` |
| MCP `query_transactions_and_spending` "recurring direct debits" aggregation | `McpPage.tsx:92` | partial: tool returns raw filtered rows; stdio returns `[]`; no recurring detection found | `financial-audit.tool.ts:185-230` |
| Escape trap example "£7,100 taper, £8,804 saving, 62% marginal" | `McpSpotlightSection.tsx:161-162` | partial: static worked example (labelled as such) | not engine-linked |
| Security page: manual entry; no payments; no form; no TLS/HSTS/AISP/FCA claims | `SecurityPage.tsx`, `SecurityPrivacySection.tsx` | implemented (E7 cleaned; guarded by `claims.test.ts:11-38`) | |

No marketing claim remains for FCA authorisation, Pro plan pricing, auto-categorisation, CSV import or "all UK banks" in `apps/marketing/src` (E7 done). The web copy under `apps/web/app/components/home` still carries the unverifiable figures and "account aggregation" wording above.

## 4. Five surprising findings

1. About 11 onboarding fields (age, student loan plan, housing, outgoings, cash, pension pot, debt, home value, mortgage balance) are sent to the backend and silently discarded, because the `user_profiles` table has no column for them. Reload reverts them to engine defaults (age 32, rent 900, outgoings 1100, cash 5000, pot 15000).
2. Scotland is unreachable: no region input anywhere, and every signed-in take-home or trap call is England/Wales/NI. Scottish engine functions have zero non-test callers.
3. The MCP guardrails resource duplicates the tax tables by hand and is stale for 2026/27; the Scottish trap rate is 67.5 in the resource and 69.5 in the prompt; `evaluate_cashflow_runway_and_health` invents 72% take-home, 900/1100 costs and 5000 savings.
4. The Mortgage vs ISA public tool is not engine-backed (imports only `persistOnboardingSeed`), and the engine barrel exports near-duplicate APIs differing only by letter case (`calculateUKTax`/`calculateUkTax`, `calculateEmployerNISavings`/`calculateEmployerNiSaving`).
5. The marketing app is already honest (E7), but the web signed-out home still ships the old claims and hard-coded metrics; the profile MCP card still mints a fake token; the mobile companion app (17 routes, own tax maths) is absent from the plan.
