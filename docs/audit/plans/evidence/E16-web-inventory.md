# E16 T0.1: Web feature inventory (apps/web)

Method: read-only. Worktree HEAD `e4ff6c3` (branch `claude/e16-product-review-e6b01a`), NOT `f5d05b0` as in the plan draft. Several plan claims are already stale (see section 3). All paths are relative to `apps/web/app/` unless they start with `packages/` or `apps/backend/`. LOC counts exclude tests, stories, `.styles.ts` and barrels. Dead-code checks used `grep -w <name>` across `apps/web/app` and `packages/*/src`, excluding `*.test.*`, `*.stories.*`, `*.styles.*`, `index.ts` and the file itself.

State key: real = works end to end; partial = works with a known gap; mock = fabricated or demo data by design; stub = shell only; dead = no non-test importer.

## 1. Feature inventory

| Feature | Route/entry | Key files (path, LOC) | LOC | State | Persistence | Maths source | Tests/stories (t/s) | Reached from | Evidence note |
|---|---|---|---|---|---|---|---|---|---|
| Signed-out home | `/` (no user) | `components/home/{LoggedOutHome 42, HomeHero 262, WebHowItWorksSection 174, InteractiveFinancialTeaser 593, FeaturePillars 511, ComparisonMatrix 143, SecurityPrivacySection 177, HomeFAQ 167, HomeCTA 86, HomeFooter 325, WebBaselineSnapshotPreview 401}` | 2,881 | real | localStorage plus cookie seed (via `persistOnboardingSeed` in the teaser) | engine (`calculateUkTax`, `calculateMortgageAmortization`) plus local (`>100000` at `InteractiveFinancialTeaser.tsx:273`, `/12` at `:290`) | t: partial. No test and no story for HomeCTA, WebHowItWorksSection, WebBaselineSnapshotPreview, InteractiveFinancialTeaser, HomeFAQ, SecurityPrivacySection | Direct visit to `/`; marketing site links | `routes/_index.tsx:255` returns `<LoggedOutHome/>`. Duplicates 7 marketing components (`apps/marketing/src/components/*`, 2,251 LOC). Web `/tools` is reachable only from `HomeFooter.tsx:139-170` and `FeaturePillars.tsx:203-260` |
| Signed-in home (dashboard) | `/` (user) | `components/dashboard/HomeDashboard.tsx` 902; `DashboardWidgetCard` 305; `WidgetSettingsModal` 125; `setup/SetupChecklist` 363; route `routes/_index.tsx` 339 | 2,034 | partial | server (profile: widgets, order, sizes, config via `updateProfile`, `HomeDashboard.tsx:148-228`); localStorage for checklist dismissal (`SetupChecklist.tsx:130,240`) | engine (`calculateSafeToSpend`, `evaluateFinancialStage`, `HomeDashboard.tsx:1,88`) | t: HomeDashboard y; WidgetSettingsModal n/n; DashboardWidgetCard n/n; SetupChecklist y | `/` after sign-in; logo; `/app` gate redirects here (`app._index.tsx:26`) | KPIs "Total Net Worth", "Monthly Net Surplus", "Weekly Safe-to-Spend" at `HomeDashboard.tsx:383,403,428`. It does NOT use `KpiStrip`. `routes/_index.tsx:4` imports `calculateNetTakeHome` from a component file (layering inversion) |
| Dashboard widgets (8) | in dashboard | `dashboard/widgets/{Accounts 332, Budget 416, Debt 173, Forecast 229, Mortgage 321, Pension 272, Savings 266, Tax 244}Widget.tsx` | 2,253 | partial | server (via dashboard config) | LOCAL compounding in 3 of 8: `ForecastWidget.tsx:53-60`, `SavingsWidget.tsx:54-61`, `MortgageWidget.tsx:69`; `BudgetWidget.tsx:81` runway label arithmetic | t/s: Debt, Mortgage, Pension y/y; Accounts, Tax, Forecast, Savings n/n; Budget t only | Home only; each card links to its page (`DashboardWidgetCard.tsx:272`) | A fourth and fifth copy of savings and mortgage maths. `WidgetSettingsModal` is used by 7 widgets (not Debt) |
| Dashboard customisation | widget settings modal | `HomeDashboard.tsx:140-228`, `utils/pageConfig.ts` 140 | 140 | real | server (profile) | none | partial (see above) | Home widget gear | 8 page keys, all enabled by default (`pageConfig.ts:122`). Default sizes `{accounts: wide, debt: wide}` (`useUserProfile.ts:136`). `enabledPages` only filters nav and widgets: no route guard (`isPageEnabled` is used only in header, drawer, bottom bar) |
| Demo sandbox | `/sandbox` | `routes/sandbox.tsx` 252; `utils/demoData.ts` 602 | 854 | mock (by design) | writes baseline atom in memory; on CTA writes seed cookie and localStorage then `/signUp` (`sandbox.tsx:124-148`) | none (fixtures) | t: sandbox.test y; s: n | `/?demo=true`, `/app?demo=true` and `/app/sandbox` all redirect here (`_index.tsx:39-40`, `app._index.tsx:11`, `app.sandbox.tsx:5`) | Signed-in users bounced to `/` (`sandbox.tsx:76`). Rendering `HomeDashboard` with `as any` casts (`:222-232`). Uses raw `rgba` shadow (`:33`) |
| Onboarding | `/app/onboarding` | `routes/app.onboarding.tsx` 1,320 | 1,320 | partial | server (`updateProfile` at `:259`, final PATCH at `:70`); localStorage baseline (`updateBaseline` `:282`) | engine (`calculateUkTax`) plus 1 local threshold (`salary >= 100000`, `:306`) | t: y; s: n | Redirect from `/` and `/app` when `onboardingCompleted === false` (`_index.tsx:63`, `app._index.tsx:19`) | Fields are now empty by default ("unknown, not zero", `:144` onward), so I-05 is fixed on this branch. 3 steps (`:98-115`). It collects `age` and `studentLoanPlan` (`:259-266`) but the backend entity has neither column (`apps/backend/src/entities/user-profile.entity.ts` has no match for `studentLoanPlan`, `age`, `ukRegion`), so both are lost server-side. No region input at all |
| Accounts and net worth | `/app/accounts` | `containers/accounts/accountsContainer/AccountsContainer.tsx` 614; `dialogs/addEditAccountsDialog/AddEditAccountsDialog` 914; `core/cards/AccountsCard` 278; `accounts/BankConnectionsList` 314; `savings/AnnualAllowancePill` 217; route 114 | 2,451 | real | server (`routes/app.accounts._index.tsx:38-60`) | none (engine `PortfolioSnapshot` for totals) | t: Container y; AddEditAccountsDialog y/s y; BankConnectionsList y; AccountsCard y | Desktop nav "Accounts"; mobile bottom bar; drawer; widget | Manual accounts are the foundation. `AnnualAllowancePill` is also on Savings and Pension |
| Monthly balance check-in | drawer on Accounts | `components/accounts/MonthlyBalanceCheckInDrawer.tsx` 306 | 306 | partial | server (PATCH `/accounts/:id` balance only; no history row) | none | t y; s y | Accounts page only (`AccountsContainer.tsx:346`) | `handleSaveAll` loops `fetcher.submit` N times on ONE fetcher (`:50-62`). React Router cancels the in-flight submission when the same fetcher submits again, so only the last account may save (to verify at runtime). It shows "saved" after 1.2s regardless (`:64-68`) |
| Account detail and history | `/app/accounts/:account` | `containers/accounts/accountDetailContainer/AccountDetailContainer.tsx` 385; `accounts/AccountDetails` 397; `charts/AccountDetailChart` 104; route 74 | 960 | partial | server, but 3 of the write calls hit endpoints that do not exist | none | t: AccountDetails y, Container y; Chart n/y | Account row click | Route actions call `DELETE /accounts/:id/details/:year`, `POST /accounts/:id/details/year`, `PUT /accounts/:id/details` (`routes/app.accounts.$account.tsx:19-39`). Backend only has `GET accounts/:id/details` (`apps/backend/src/finance.controller.ts:115`; grep for `details/year` finds nothing). This confirms G-04 |
| Connect bank wizard and sync | dialog on Accounts | `dialogs/connectBankWizard/ConnectBankWizard.tsx` 926; `accounts/BankConnectionsList` 314; `routes/app.accounts._index.tsx:52-90` | 1,240 | partial | server | none | t y | Accounts "Connect bank" | PAT path works. OAuth return URL is `${origin}/auth/callback` (`app.accounts._index.tsx:82`), which is the WorkOS handler (section 5), so a bank return would be treated as a WorkOS code exchange |
| Budget planner | `/app/budget` | `containers/budget/BudgetContainer.tsx` 595; `budget/BudgetDashboard` 1,032; `budget/BudgetCategoryTable` 844; `budget/AddCategoryModal` 239; route 20 | 2,730 | partial | server, via browser-side `apiFetch` (`BudgetContainer.tsx:153-241`) | engine (`calculateSafeToSpend`) | t: Container y; Dashboard y; CategoryTable y; AddCategoryModal y | Desktop nav; bottom bar; drawer; widget | "MTD Settled Actuals" is now gated by `actualMtdGbp != null` (`BudgetDashboard.tsx:217-220,505`), so no longer fabricated, but nothing in the web or the transactions path writes `actualMtdGbp`, so it effectively never shows. `color="success.500"` primitive token at `:515`. No month dimension |
| Budget setup wizard | modal in Budget | `budget/BudgetSetupWizard.tsx` | 1,025 | real | server (`seed-defaults`, `BudgetContainer.tsx:210`) | none | t y | Budget empty state (`BudgetContainer.tsx:465`) | Overlaps onboarding steps 2 and 3 |
| Runway calculator | card inside Budget | `budget/RunwayCalculator.tsx` 1,236; `utils/runwayStorage.ts` 161 | 1,397 | partial | **localStorage** key `flump_runway_calculator_settings` (`runwayStorage.ts:12-45`) | LOCAL: `calculateRunwayStats` in `utils/runwayStorage.ts:78-158` (pool / burn); not in finance-engine (the engine mentions runway only in `health-score.ts`, `types.ts` and `ai-context-pack.ts`) | t y | `BudgetContainer.tsx:574` | The largest low-frequency component on the budget page. Settings are per browser |
| Debt payoff | `/app/debt` | `containers/debt/DebtContainer.tsx` 495; `debt/DebtSummaryCards` 172; `DebtAccountsList` 207; `AddDebtDialog` 256; `PayoffStrategySwitcher` 457; `UkDebtInstrumentsCard` 548; `DebtToWealthBridgeCard` 232; `features/debt/utils/{debtAccountMapping 36, debtInputs 44}`; `utils/debtSummary.ts` 50; route 87 | 2,584 | real | server (`routes/app.debt.tsx:27-59`) | engine (`calculateDebtSchedule`, `compareAvalancheAndSnowball`, `calculateZeroPercentCliff`, `calculateOverdraftCost`, `calculateCarFinanceBalloon`, `evaluateUkStudentLoan`, `calculateDebtToWealthBridge`) | t: Container y; DebtSummaryCards n/n; UkDebtInstrumentsCard n/n; DebtToWealthBridgeCard n/n; others y | Desktop nav top level "Debt". **NOT in mobile drawer or bottom bar** (section 4). Widget | Cleanest engine usage in the app. Debt law components (`PayoffStrategyControls`, `PromoCliffTracker`) are dead |
| Savings | `/app/savings` | `containers/savings/SavingsContainer.tsx` 318; `savings/SavingsAccountsList` 756; `SavingsForecasterCard` 576; `SavingsSummaryCards` 229; `AddSavingsAccountDialog` 267; `AnnualAllowancePill` 217; route 109 | 2,472 | real | server (`routes/app.savings.tsx`) | LOCAL: `/100/12` and `(1+rate)` loops at `SavingsForecasterCard.tsx:97-120,171-187` and `SavingsContainer.tsx:172-184` | t y; stories mixed | Desktop "Wealth" dropdown; bottom bar "Savings"; drawer; widget | `SavingsForecasterCard` does NOT wrap `SavingsForecaster` (the plan said it did). They are two separate implementations. Forecast's version is in `forecast/SavingsForecaster.tsx:44` |
| Pension | `/app/pension` | `containers/pension/PensionContainer.tsx` 863; `pension/PensionForecasterCard` 1,185; `PensionAccountsList` 638; `PensionQuickStartWizard` 590; `AddPensionAccountDialog` 374; `PensionSummaryCards` 206; route 179 | 4,035 | real | server (`routes/app.pension.tsx:16-151`) | MIXED: engine for `calculate100kTaxTrap`, `calculateEmployerNISavings`, `calculateUKEWNITakeHome`; LOCAL `UK_QUALIFYING_UPPER = 50270` (`PensionForecasterCard.tsx:48`), `/12` and `(1+monthlyRate)` at `:313-349`; `PensionContainer.tsx:235-245,359`; `PensionQuickStartWizard.tsx:112-128` | t y | "Wealth" dropdown; drawer; widget. Not in bottom bar | Hard-coded tax threshold in a component. The £100k trap UI lives here |
| Mortgage | `/app/mortgage` | `containers/mortgage/MortgageContainer.tsx` 1,292; `mortgage/MortgageTracker` 620; `OverpayVsSaveCompare` 598; `OverpaymentSimulator` 494; `RemortgageShockSim` 289; `utils/mortgagePayment.ts` 18; route 18 | 3,331 | partial | server (profile PATCH plus `apiFetch /accounts/:id`, `MortgageContainer.tsx:127-129`) | LOCAL in all 4 simulators plus util plus widget: `MortgageTracker.tsx:63`, `OverpaymentSimulator.tsx:37`, `OverpayVsSaveCompare.tsx:57-58`, `RemortgageShockSim.tsx:58-61`, `mortgagePayment.ts:12`. Engine used only for `calculateLtvMilestones` here. The engine has `calculateMonthlyMortgagePayment`, `calculateMortgageAmortization`, `calculateMortgageVsIsa` (`packages/finance-engine/src/mortgage.ts:12,70,168`) | t y | "Wealth" dropdown; drawer; widget | 5 independent amortisation implementations in the web app plus 1 in `@repo/ui` calculators plus the MCP tool. This is the J3 split |
| Forecast | `/app/forecast` | `containers/forecast/ForecastContainer.tsx` 308; `forecast/SavingsForecaster` 660; `forecast/UKTaxCalculator` 744; `tax/TaxTrapAlertBanner` 271; route 18 | 2,001 | real | none (component state only; reads baseline localStorage) | `UKTaxCalculator`: engine (`calculateUKEWNITakeHome`, `calculateEmployerNISavings`; `/12` is display only). `SavingsForecaster`: LOCAL (`:44`) | t: Container y; UKTaxCalculator y; SavingsForecaster y | "Planning" dropdown; drawer; widget | It is a 2-tab page (`ForecastContainer.tsx:22`) composed of 3 components that exist elsewhere. `calculateForecast` and `calculateCompoundTrajectory` (`packages/finance-engine/src/forecast.ts:29,185`) have no live web consumer (only the dead `WealthCheckHeroWidget`) |
| Tax and Self Assessment | `/app/tax` | `containers/tax/TaxContainer.tsx` 2,260; `tax/TaxIncomeSectionCard` 736; `CopyTaxYearModal` 749; `PaymentsOnAccountCard` 196; `TaxTrapAlertBanner` 271; route 152 | 4,364 | real | server (`routes/app.tax.tsx`: records, bulk, delete-year, profile); receipts as base64 in state (`TaxContainer.tsx:149-152`) | engine (`calculateUKTax`, tax-year helpers); local `/12` display only (`PaymentsOnAccountCard.tsx:41`, `TaxTrapAlertBanner.tsx:65-66`) | t y; stories mixed | "Planning" dropdown; bottom bar "Tax"; drawer; widget | The bottom bar gives "Tax" a slot but not Pension, Mortgage or Debt. Largest file in the web app |
| Profile and settings | `/app/profile` | `components/budget/UserProfilePanel.tsx` 1,215 (note: lives under `budget/`); `hooks/useUserProfile.ts` 395; route 41 | 1,651 | partial | server | engine via `calculateNetTakeHome` (`UserProfilePanel.tsx:185-250`): GB uses `calculateUKEWNITakeHome`, IE uses `calculateIrishTakeHome`, **every other country returns untaxed gross / 12** (`:196-209,250`) | t y; s n | Avatar link in header (`Header.tsx:165`); drawer footer (`MobileNavDrawer.tsx`) | Danger zone, change password, country and currency selects, "AI & MCP Access" tab (`:500`). No delete-account and no export. The plan quoted 1,348 lines; it is 1,215 now |
| Country and currency selector | Profile | `UserProfilePanel.tsx:41-70,707-745`; `hooks/useFormatCurrency.ts` 82 | n/a | partial | server (`country`, `currency` on profile) | `calculateNetTakeHome` handles GB and IE only | n/a | Profile | 15 countries (the plan said 11) and 11 currencies. 13 of 15 countries get take-home equal to gross. `useFormatCurrency` switches locale per currency (EUR becomes `de-DE`), contradicting the en-GB law. `routes/_index.tsx:159` passes `country` into the dashboard take-home |
| AI and MCP access card | Profile tab | `features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx` | 837 | **mock** | none | n/a | t y | Profile "AI & MCP Access" | Rendered with no props (`UserProfilePanel.tsx:980`), so `onGenerateToken` is undefined and the card falls back to a fake generator, `flump_pat_${Math.random()...}` (`McpConnectionCard.tsx:108-114`). The web app has no call to `/mcp-tokens` or `/mcp` anywhere. Confirms G-06 |
| Public tools | `/tools`, `/tools/:slug` | `routes/tools.$slug.tsx` 474; `routes/tools._index.tsx` 322; `components/tools/*Tool.tsx` (7 files, 8-10 LOC each) | 876 | real | none | engine, via `@repo/ui/calculators` | t: tools.test y; s: n | Signed-out footer and FeaturePillars links only. **Absent from every signed-in nav surface** | 7 slugs (`tools.$slug.tsx:42-275`). Best time-to-first-value. Not linked from the app shell |
| Auth and plumbing routes | `/login`, `/signUp`, `/logout`, `/callback`, `/auth/callback`, `/ping`, `/app`, `/:feature` | `routes/{login._index 21, signUp._index 21, logout._index 39, callback 72, auth.callback 72, ping 51, app._index 31, $feature._index 27, app.sandbox 10}.tsx` | 344 | real | cookie (`flump_has_session`, `callback.tsx:26`) | none | login, signUp, ping, app.sandbox n/n; others y | n/a | See sections 5 and 6 |
| i18n | all | `i18n.ts`, `entry.*.tsx`, `public/locales/{en,es}/{common,home}.json` | ~80 JSON lines | stub | n/a | n/a | n/a | n/a | Section 7 |
| Financial baseline store | state | `state/baseline.store.ts` 140 | 140 | partial | localStorage `flump_financial_baseline_v1`, **not user-scoped** (`:14,39,52`); seed cookie | engine types | t y | 10 importers (containers, onboarding, sandbox, profile) | Cross-user leak on shared browsers. Merges with server profile in `useUserProfile.ts:16`. Persisted `studentLoanPlan` never reaches the server |
| Nav shell | all pages | `structure/header/Header 191`, `MobileNavDrawer 233`; `navigation/NavMenu 359`, `MobileBottomBar 146`, `ThemeToggle`, `UserAvatar`, `UserLogin`, `HomeLogo` | 1,347 | real | server (`enabledPages`) | none | partial | root layout (`root.tsx:104,119`) | Section 4 |

## 2. Dead code (verified)

All entries have zero importers once tests, stories, styles and barrels are excluded. Every one of them still has a test, so test counts overstate the live surface.

| Item | LOC | Test/story | Only referenced by | Verdict vs plan |
|---|---|---|---|---|
| `components/navigation/GlobalBaselineScenarioBar.tsx` | 380 | t y, s n | nothing | Confirmed |
| `state/scenario.store.ts` | 74 | t y, s n | the dead bar above, plus `state/index.ts:2` (which no one imports) | Confirmed |
| `components/forecast/ScenarioLayersWidget.tsx` | 230 | t y, s n | nothing | Confirmed |
| `components/home/WealthCheckHeroWidget.tsx` | 717 | t y, s n | nothing | Confirmed. It is the only web user of `calculateCompoundTrajectory`, `calculateAvalanche`, `estimateSalarySacrificeTaxSaving` and `calculateUKTakeHome` |
| `components/savings/SavingsQuickStartWizard.tsx` | 333 | t y, s n | nothing | Confirmed |
| `features/sandbox/components/SandboxTemplates` | 250 | t y, s y | `features/sandbox/index.ts` (no importer); `routes/sandbox.tsx` does not import it | Confirmed. Imports `PayoffStrategyControls` |
| `features/debt/components/PayoffStrategyControls` | 144 | t y, s y | `SandboxTemplates` (itself dead) | Confirmed. Uses `SimulatorSplitLayout`, `SliderField` or `CollapsibleDrawer` |
| `features/debt/components/PromoCliffTracker` | 103 | t y, s y | `features/debt/index.ts` barrel only | Confirmed as dead. **Correction:** it does NOT use any of the layout primitives; only `PayoffStrategyControls` and `SandboxTemplates` do |
| **New:** `features/debt/hooks/useDebtPayoffSchedule.ts` | 38 | t n, s n | `features/debt/index.ts` barrel only (the barrel has no importer) | Not in the plan |
| **New:** `components/core/inputs/slider/FLPSlider.tsx` | 190 | t y, s n | nothing | Not in the plan |
| **New:** `components/core/progress/FLPSpinner.tsx` | 41 | t y, s y | nothing | Not in the plan |
| **New:** `components/core/table/FLPTable.tsx` | 152 | t y, s n | nothing | Not in the plan |
| **New:** `components/accounts/AccountDetailsStyles.ts` | 17 | referenced by a test only (`MonthlyBalanceCheckInDrawer.test.tsx:3`) | nothing | Not in the plan |
| **New (barrels):** `features/debt/index.ts`, `features/sandbox/index.ts`, `state/index.ts` | 3, 2, 2 | n/a | no importers | Not in the plan |
| `utils/demoData.ts` `isDemoMode` | n/a | n/a | live, but only to redirect `?demo=true` (`_index.tsx:39`, `app._index.tsx:11`) | Not dead. The plan said `?demo=true` renders a branch at `_index.tsx:23-25`; it now redirects |

Total dead LOC (non-test, excluding barrels): about 2,670.

Not dead, despite looking so: `PensionQuickStartWizard` (imported by `PensionContainer.tsx:21`), `BudgetSetupWizard` (`BudgetContainer.tsx:9`), `DebtToWealthBridgeCard` (`DebtContainer.tsx:19,420`), `RunwayCalculator` (`BudgetContainer.tsx:574`), `AnnualAllowancePill` (3 pages).

Layout law primitives (`KpiStrip`, `SimulatorSplitLayout`, `SliderField`, `CollapsibleDrawer`): a `-l` grep across `apps/web/app` returns only `PayoffStrategyControls.tsx` and `SandboxTemplates.tsx`, both dead. **No live web page uses any of them.** So deleting them removes the only compliant code (D10), and every live simulator page is non-compliant with AGENTS.md section 3.

## 3. Maths outside finance-engine (verified, with file:line)

Confirmed local maths (the plan list was right, and it is broader):

| File | Lines | What |
|---|---|---|
| `components/forecast/SavingsForecaster.tsx` | 44 | monthly rate `/100/12` |
| `components/savings/SavingsForecasterCard.tsx` | 97, 102, 117-120, 171-187 | per-account and uniform monthly compounding, time-to-target loop |
| `containers/savings/SavingsContainer.tsx` | 172-184 | weighted-rate compounding |
| `components/pension/PensionForecasterCard.tsx` | 48, 313-319, 331, 349 | `UK_QUALIFYING_UPPER = 50270` constant, monthly contributions, compounding |
| `containers/pension/PensionContainer.tsx` | 235-245, 359-360 | contribution maths |
| `components/pension/PensionQuickStartWizard.tsx` | 112-128 | `(1+r)^n` future value, 4% drawdown (`0.04`) |
| `components/mortgage/MortgageTracker.tsx` | 63 | amortisation |
| `components/mortgage/OverpaymentSimulator.tsx` | 37 | amortisation |
| `components/mortgage/OverpayVsSaveCompare.tsx` | 57-58 | two-rate compare |
| `components/mortgage/RemortgageShockSim.tsx` | 58-61 | payment formula |
| `utils/mortgagePayment.ts` | 12 | payment formula (the engine has `calculateMonthlyMortgagePayment`) |
| `utils/runwayStorage.ts` | 78-158 | runway = pool / monthly burn |
| `components/dashboard/widgets/ForecastWidget.tsx` | 53-60 | FV |
| `components/dashboard/widgets/SavingsWidget.tsx` | 54-61 | FV (the comment at `:53` states the formula) |
| `components/dashboard/widgets/MortgageWidget.tsx` | 69 | amortisation |
| `routes/app.onboarding.tsx` | 306 | `salary >= 100000` threshold |
| `components/home/InteractiveFinancialTeaser.tsx` | 273, 290 | `gross > 100000`, months to years |

Corrections to the plan:
- **Wrong:** `RunwayCalculator.tsx` itself holds little arithmetic; the runway maths is in `utils/runwayStorage.ts`.
- **Wrong:** "`SavingsForecaster` is used on both Savings and Forecast". Savings uses `SavingsForecasterCard` (own implementation); only Forecast uses `SavingsForecaster`. That is two separate compounding implementations, plus the container and the two widgets, so five in total.
- **Wrong:** "`MortgageContainer.tsx` contains local `/12`". Its grep hits are zero; the maths sits in the four simulators plus `utils/mortgagePayment.ts`, imported at `MortgageContainer.tsx:30`.
- **Broader:** the three dashboard widgets (Forecast, Savings, Mortgage) also duplicate it.
- **Engine-clean:** Debt (all of `components/debt/*` and `DebtContainer`), Tax (`calculateUKTax`), Forecast take-home (`UKTaxCalculator`) and the dashboard KPIs (`calculateSafeToSpend`, `evaluateFinancialStage`).

Engine exports with no live web consumer (grep over `apps/web/app`, non-test): `calculateFinancialHealthScore`, `projectCrossoverWealth`, `analyzePromoCliff`, `calculateSection24*`, `calculateMortgageVsIsa`, `calculateForecast`, `calculateMonthlyMortgagePayment`, `calculateTaxTrap`. `calculateMortgageAmortization` is used only by the signed-out teaser (`InteractiveFinancialTeaser.tsx`). `calculateMortgageVsIsa` and `calculateCompoundTrajectory` are consumed by `packages/mcp/src/tools/mortgage-isa.tool.ts` (MCP) and, for the public tools, via `@repo/ui` calculators.

Related token and style debt found incidentally (for E15 and law baselines): 86 non-test files contain raw `rgba(`/hex; 19 use primitive scale tokens such as `success.500`; only 36 files mention `tabular-nums`. `callback.tsx:60` hard-codes `#fff` and inline styles.

## 4. Navigation per breakpoint

Header (`components/structure/header/Header.tsx`) renders the desktop menu when not mobile (`:140-143`): "Home" for everyone, then, when signed in, `AUTH_DESKTOP_NAV_ROUTES` (`:38-85`).

| Surface | Items | Pages reached | Not reached |
|---|---|---|---|
| Desktop nav (`Header.tsx:38-85`) | Home, Debt, Budget, Accounts, "Wealth" dropdown (Savings, Pension, Mortgage), "Planning" dropdown (Forecast, Tax); avatar link to Profile (`:165`) | all 8 pages plus Profile | `/tools`, Onboarding |
| Mobile drawer (`MobileNavDrawer.tsx:75-94`) | Home, Budget, Accounts, Wealth (Savings, Pension, Mortgage), Planning (Forecast, Tax); footer Profile link, theme toggle, login | 7 pages plus Profile | **Debt is missing** (`rawAuthRoutes` has no `debt` entry) and `/tools` |
| Mobile bottom bar (`MobileBottomBar.tsx:60-146`, shown only when signed in, `root.tsx:119`) | Budget, Savings, Accounts, Tax, "More" (opens the drawer) | 4 pages | Debt, Pension, Mortgage, Forecast |
| Signed-out header | "Home", theme toggle, login | none | `/tools` (only via the footer and FeaturePillars) |
| Dashboard widgets (Home) | 8 cards each linking to its page (`DashboardWidgetCard.tsx:272`) | all 8 | the only mobile route to Debt |
| `enabledPages` | `isPageEnabled` filters all three nav surfaces and the widgets (`Header.tsx:105-121`, `MobileNavDrawer.tsx:75-94`, `MobileBottomBar.tsx:108`) | per user | route guards: none. A hidden page is still reachable by URL |

Consequence: on a phone, Debt (the product's strongest module) is reachable only from the home widget, while Tax (a niche SA ledger) gets a permanent bottom-bar slot.

## 5. Duplicate callback routes

- `routes/callback.tsx` and `routes/auth.callback.tsx` are byte-identical except the component name (`CallbackRoute` vs `AuthCallbackRoute`). Both build `authLoader({returnPathname: "/app"})` and set the `flump_has_session` cookie. Each has its own test.
- Which is live: `/callback`. `login._index.tsx:10` and `signUp._index.tsx:10` use `${origin}/callback`; `.env.example:2` has `VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback`; `callback.tsx:15-22` rewrites the redirect URI to `/callback` on localhost.
- `/auth/callback` is the stale copy, but it is wired into the bank OAuth flow: web `app.accounts._index.tsx:82` and the backend default `http://localhost:5173/auth/callback` (`apps/backend/src/finance.service.ts:286`). The backend also has its own `/bank-connections/callback` (`:208`). A bank provider returning to `/auth/callback?code=...` hits a WorkOS code exchange and fails. Confirms G-02 and gives its mechanism.
- Fix is either one route plus a distinct bank-callback route that is not a WorkOS loader, or delete `/auth/callback` and finish the real bank callback (E6 decision).

## 6. Demo systems, legacy redirects, gates

- **Demo is already one system on this HEAD**: `/sandbox`. `?demo=true` survives only as a redirect (`_index.tsx:38-41`; `app._index.tsx:11`) and `/app/sandbox` redirects to `/sandbox` (`app.sandbox.tsx:5`). The plan's "two demo systems" (I-10) is therefore already resolved in code; what remains is `isDemoMode` plus `getSandboxPersonaData` (602 LOC of fixtures in `utils/demoData.ts`) and the sandbox's `as any` casts. Three personas: debt (£34k), medium (£45k), high (£115k) (`sandbox.tsx:99-120`).
- `/$feature` legacy redirects (`$feature._index.tsx:4-15`): `/accounts`, `/budget`, `/debt`, `/forecast`, `/mortgage`, `/onboarding`, `/pension`, `/profile`, `/savings`, `/tax` go to `/app/*`; anything else goes to `/`. There is no `/savings-and-investments`-style alias.
- `/app` is a gate-only route (`app._index.tsx`): signed out goes to `/login` (or `/sandbox` with `?demo=true`), onboarding incomplete goes to `/app/onboarding`, else `/`.
- The home loader redirects an incomplete-onboarding user from `/` (`_index.tsx:63`).

## 7. i18n

- Configured for `en` and `es` (`i18n.ts:2`), namespaces `common` and `home`, wired in `entry.client.tsx` (browser language detector) and `entry.server.tsx` (`remix-i18next`).
- Content: `public/locales/en/common.json` has 55 keys; `es/common.json` has 19 (35 percent coverage); both `home.json` files are empty objects. The route handle declares `i18n: ["common","home"]` (`_index.tsx:17-19`) but `home` has no strings.
- 15 files call `useTranslation`; about 155 `t("...")` calls with English defaults, so most copy is hard-coded English.
- There is no language switcher anywhere (no `changeLanguage` call in `app/`). Spanish is shown only if the browser asks for it, and then it is a 19-key partial.
- Verdict: dead weight with a maintenance cost; the `en-GB` formatting law is the real requirement.

## 8. Country selector (summary)

15 countries (`UserProfilePanel.tsx:41-57`), 11 currencies (`:59-71`). Only GB and IE have tax logic; the other 13 silently return gross as net (`:250`). `getCurrencySymbol` and `getLocale` in `useFormatCurrency.ts:3-60` localise to the selected currency's locale (e.g. EUR gives `de-DE`, USD gives `en-US`), which conflicts with the `en-GB` formatting law. Persisted server-side. Region (England, Scotland, Wales, NI), the one UK-relevant selector, does not exist anywhere in the web app.

## 9. Persistence summary

| Store | Where | Scope | Items |
|---|---|---|---|
| Server (backend) | `/accounts`, `/budget-entries`, `/tax-records`, `/user-profile`, `/bank-connections` | per user | accounts, budget, tax, profile, widgets, checklist steps |
| localStorage | `flump_runway_calculator_settings` | per browser | runway settings (`runwayStorage.ts:12`) |
| localStorage | `flump_setup_checklist_dismissed` | per browser | checklist dismissal (`SetupChecklist.tsx:130,240`) |
| localStorage | `flump_financial_baseline_v1` | per browser, **not user-scoped** | baseline (`baseline.store.ts:14`) |
| localStorage | `flump-theme` | per browser | theme (`hooks/useTheme.ts`) |
| cookie | onboarding seed (cross-subdomain), `flump_has_session` | per browser | pre-login seed, session presence |
| In-memory only | Forecast, simulators, Mortgage sliders | per page load | all inputs |
| Not persisted anywhere | `age`, `studentLoanPlan`, region | n/a | collected or needed, dropped by the backend entity |

## 10. Five-line summary of the verified differences from the plan

1. `?demo=true` is no longer a second demo; it redirects to `/sandbox`.
2. Onboarding no longer pre-fills fiction (I-05 fixed) and budget "actuals" are now gated, but actuals have no data source.
3. `SavingsForecaster` is not shared between Savings and Forecast.
4. 5 further dead files plus 3 dead barrels beyond the plan list (FLPSlider, FLPSpinner, FLPTable, AccountDetailsStyles, `useDebtPayoffSchedule`, three barrels).
5. Debt is missing from the mobile drawer and the bottom bar.
