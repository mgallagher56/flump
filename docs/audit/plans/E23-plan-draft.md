# E23 Core-journey correctness: implementation plan (draft, read-only planner)

**Status:** this is a draft and nothing is implemented. I checked every claim against `origin/main` at **e4ff6c3**, after a fresh `git fetch`; main has not moved since the E16 pin. The current worktree branch `ci-release-please-token` is 1 commit ahead of main and that commit only touches CI.

**Markers:** **V** means I read it in code on origin/main. **I** means inference. **R** means someone else reproduced it at runtime (E16 or E15) and I re-read the root cause in code.

**Key baseline facts (V):**
- E4's engine work is fully on main. `git cherry origin/main origin/e4-tax-engine` shows no unmerged patches. On main:
  - `uk-tax-year.ts` and the vector catalogue
  - `payoffAchievable` (C-13)
  - forecast fix (C-14)
  - one student-loan table (C-08)
  - `effectiveMarginalRatePct` (D7-a)
  - record-date bucketing
- What is left of E4:
  - **Owner sign-off.** `packages/finance-engine/src/test-vectors/uk-tax.vectors.test.ts:29` and `:140` still assert `signedOffBy` is null on all 200 vectors. The sheet is at `packages/finance-engine/docs/tax-vector-signoff.md`.
  - **The web-side tasks.** C-11 (E4 T10), C-15/F-02 (T13), and B-07 web (T15a/b/c). The T17 guard script does not exist under `scripts/`.
- `DECISIONS.md` says "All others: follow the recommended decisions". So these E4 recommendations count as decided:
  - D2-a: assets keep their sign; liabilities are stored as -|owed|.
  - D3-a.
  - D4-b+c: the dashboard shows the self-assessment balance, with an empty state.
  - D5-a: floats, with `roundPence` at result boundaries.
  - D7-a: two named rate fields.
- In flight in another session: the onboarding 500s and the `PATCH /accounts/:id` 404. This plan adds regression guards for them, plus two related defects that session should take on (D04 and D02b below).

---

## 1. Verified defect register

Severity runs from P0 (blocks release or shows a wrong headline figure) to P2. "Owner" is the epic that owns the fix.

| ID | Symptom | Root cause (file:line on origin/main) | Sev | User impact | Owner | Fix approach | Test that proves it | Status |
|---|---|---|---|---|---|---|---|---|
| D01 | Onboarding Finish 500s; **every** web "add account" 500s | `apps/backend/src/entities/account.entity.ts:39-40` makes `currency` NOT NULL with no default (Baseline migration line 20 matches). `account-intake.service.ts:92-106` drops undefined fields; `:207-223` saves. None of the web create paths sends `currency`: `app.onboarding.tsx:335-341`, `app.accounts._index.tsx:38-43`, `app.debt.tsx:28`, `app.pension.tsx:33,118`, `app.savings.tsx:31`. Grep finds 0 `currency` matches in those files | P0 | A new user can never reach the dashboard; no account can be created anywhere | E23 (in flight, T-FIX-1) | Backend defaults `currency` to `"GBP"` in `pickAccountFields` on create, and later adds a DB default through a migration | Contract test on Postgres: POST each real web payload and expect 201 | V / R; **in flight** |
| D02 | Budget entry from onboarding 500s | `budget.controller.ts:277` reads `body.name`; `app.onboarding.tsx:343-354` sends `title` | P0 | Same as D01 | E23 (in flight) | Accept `name`, or `title` as an alias during the transition; web switches to `name` | Contract test | V / R; **in flight** |
| D02b | Retrying onboarding creates duplicate entries | `app.onboarding.tsx:316-328` dedupes using the `title` field of GET `/budget-entries`, but the backend returns `name`, so the seen-set is always empty | P1 | Duplicate income/rent rows after a retry, which inflates income | E23 (hand to in-flight session) | Read `name` | Web unit test with a GET mock that returns `name` | V (new) |
| D03 | `PATCH /accounts/:id` 404 | `finance.controller.ts:130-131`: stacked `@Put` and `@Patch`; only the top decorator survives | P0 | Account edit, check-in, Pension, Savings, Debt and the mortgage-rate save all fail | E23 (in flight) | Two separate handler methods, or `@Patch` only | Route inventory test plus contract test | V / R; **in flight** |
| D04 | Bank "sync now" 404 (new) | `finance.controller.ts:165-166`: stacked `@Post(".../sync")` over `@Post(".../refresh")`. Web calls `/refresh` at `app.accounts._index.tsx:53-55`, and so does mobile at `client.ts:442` | P2 (bank connect is demoted under E16 D4-A) | Manual sync silently fails | E23, or the in-flight session | Same fix as D03 | Route inventory test | V in code; runtime 404 is I, by analogy with D03 |
| D05 | Account history edit 404s (G-04) | `app.accounts.$account.tsx:19-41` calls DELETE `/accounts/:id/details/:year`, POST `/accounts/:id/details/year` and PUT `/accounts/:id/details`. The controller only has GET at `finance.controller.ts:115` | P1 | Edits fail | E16 T-CUT-4 (D12-B: remove the UI) | Remove the UI; the route inventory test stops it coming back | Route inventory test | V |
| D06 | Region is never asked or stored | `user-profile.entity.ts:9-223` has no region column. `app.onboarding.tsx` has no region field (grep). `profile.ts:17` hard-codes `ukRegion: "ENGLAND_NI_WALES"` and `userProfileToFinancialBaseline` (`profile.ts:143-241`) never maps one | P0 for Scottish users | Scottish users get England figures everywhere | E23 (T-FIX-2) | Add a `tax_region` column, capture it in onboarding and the profile, feed it to the selectors | Scottish persona: take-home at £50k for 2026/27 uses the Scottish bands (vector 8,982.05 tax) | V |
| D07 | 10 onboarding fields are sent and silently dropped | `app.onboarding.tsx:259-279` sends `age`, `studentLoanPlan`, `housingStatus`, `monthlyHousingCost`, `monthlyOtherOutgoings`, `totalCashSavings`, `totalPensionPot`, `totalUnsecuredDebt`, `homeValue`, `mortgageBalance`. The allow-list in `user-profile.service.ts:265-321` has none of them, so `profile.ts:185-222` fills in defaults | P0 | Figures "revert" after reload; defaults replace real answers | E23 | Schema in section 3. Fields that duplicate accounts (cash, pot, debt, mortgage balance) become account rows, not profile columns | Contract test: PATCH then GET round-trips every field | V |
| D08 | Student loan is ignored in signed-in take-home | `calculateNetTakeHome` (`components/budget/UserProfilePanel.tsx:185-215`) never passes a plan, although `calculateUKEWNITakeHome` (`tax-rules.ts:1120-1126`) accepts one. `PensionContainer.tsx:258-271` also omits it | P0 for Plan 1/2/4/5 users | Take-home is overstated (Plan 2 at £38k in 2026/27: about £780 a year, I) | E23 | Selector reads the stored plans | Sam persona: take-home includes the Plan 2 deduction from the signed-off vector | V |
| D09 | Unknown employment type shows gross pay as take-home (new) | `tax-rules.ts:1147` returns `defaultResult` with `netAnnual: gross` unless the type is employed or self-employed. `UserProfilePanel.tsx:205-213` maps null or "other" to null. Called from `_index.tsx:157-166` | P1 | The Home KPI shows gross/12 as "take-home" | E23 | Selector returns `unknown`, missing `employmentType` | Unit test: null type gives an `unknown` figure, never gross | V |
| D10 | Three or four take-home figures for one user (£2,382 / £5,916 / £6,200) | Budget income rows (`_index.tsx:74-78`), including an "income" row written once at onboarding (`app.onboarding.tsx:363-368`). The engine estimate in `_index.tsx:157-166`. Stored `profile.monthlyTakeHome` (written at onboarding line 262, never recomputed). The context pack's `gross/12*0.72` fallback (`ai-context-pack.ts:205-208`) | P0 (trust) | Conflicting headline numbers | E23 (T-FIX-3) | One `selectTakeHome` result, plus a clearly labelled "budgeted income" | Cross-page consistency test | V / R |
| D11 | Trap shows 60% on one surface and 62% on another | The engine is fixed (D7-a, `types.ts:327`). The surfaces still hard-code copy: `PensionContainer.tsx:387,399,405` says "60%"; `TaxTrapAlertBanner.tsx:114` heading says "60%" while `:139` body says "62%" | P1 | Contradictory advice | E23 | Copy comes from `selectTrap` with the two named rates | Consistency test plus a copy test | V (engine part stale, surfaces confirmed) |
| D12 | Safe-to-spend £0 vs £774 a week, or £111 vs £231 | Four input recipes over one engine primitive (`health-score.ts:221-241`): `HomeDashboard.tsx:99-105` (invented 60/40 split of living costs); `BudgetDashboard.tsx:133-161` (name-substring heuristics "food", "card", "loan", 20% fallback); `ai-context-pack.ts:205-221` (0.72 and £900/£1,100 fallbacks); `mcp/src/tools/financial-audit.tool.ts:80-101` | P0 (trust) | The same question gives different answers | E23 | One `selectSafeToSpend` with a defined formula (owner decision D-6) | Consistency test | V / R |
| D13 | Hard-coded £45,000 salary on Tax and the calculator | `TaxContainer.tsx:76-83` prefers the client baseline. `state/baseline.store.ts:76-86` returns `DEFAULT_FINANCIAL_BASELINE` (45,000) during SSR and when nothing is stored. `hooks/useUserProfile.ts:278` maps a profile with no salary to 45,000 (`profile.ts:149-152`). `UKTaxCalculator.tsx:32` uses `initialSalary ?? 45000`. The localStorage key `flump_financial_baseline_v1` (`baseline.store.ts:14`) is not scoped per user (G-10) | P0 | An invented salary; on a shared browser, another user's baseline | E23 (with E2 principle) | Server profile is the source; no client default; the store becomes what-if only | Loader/render test: no salary renders "Not set", never 45,000 | V / R |
| D14 | MCP serves age 32 / £45k / £5k cash / £15k pot to every user | `mcp.service.ts:96` calls `userProfileToFinancialBaseline`, which spreads the defaults (`profile.ts:13-37, 182-241`); `mcp/src/transports/stdio.ts:41` does the same | P1 | AI answers built on invented data | E17 (T0.3, T1.1) using E23's mapper | `buildFinancialPicture` with no default spread | E17 "no default leakage" test | V |
| D15 | C-11: dashboard tax due = `netProfit * 0.29` (£127k vs £0) | `_index.tsx:144-152`: all records from all years, frequency ignored, flat 29% | P0 (hide before PR 368) | Headline tax figure invented | E23 | P0: hide or "Not calculated". P1: `estimateTaxDueForYear`, current year, D4-b | Loader test: an annual 2019 record is excluded; 30k self-employed matches `calculateUKTax` | V |
| D16 | Four tax years stack into one (+£446,714) | `tax-calculator.ts:251-260`: an "annual" record repeats on every anniversary forever when `endDate` is null, so four yearly salary records all land in the latest year. Home also sums every year (`_index.tsx:144`) | P1 | Wrong SA estimate for multi-year users | E23 with E22 | Semantics decision D-7; migration or backfill of `end_date` | Engine test with the heavy persona's 28 records | V (code) / R |
| D17 | C-15: overdrawn account counted as a positive asset; overdraft missing from debt total | `finance-engine/src/portfolio.ts:167` (`Math.abs`), `:336` (history `Math.abs`). `packages/banking/src/server/orchestrator.ts:187-200` takes abs of assets. Also `_index.tsx:102` (typeTotals abs) and `BudgetDashboard.tsx` `fmt` takes abs | P1 | Net worth overstated by twice the overdraft | E23 (E4 T13 via D2-a) | Signed balances (section 5) | Engine and banking tests (F-02: -1500) | V |
| D18 | Plan 2 student loan treated as a payable debt (£785/mo minimum) | No student-loan account type (`account.entity.ts:17-25`). `categorizeAccountType` maps "loan" to debt (`portfolio.ts:94-102`). `toDebtItems` (`:278-314`) estimates the minimum as 2.5% | P1 | Debt budget and total inflated; wrong payoff advice | E23 | New `Student Loan` type with a plan, kept out of payoff | Sam and heavy personas: debt total excludes the student loan | V / R |
| D19 | Net worth -£210k for a homeowner; no property asset | No property type or home-value column. `AccountCategory` (`portfolio.ts:19-26`) has no `property`. `profile.ts:204-209` **invents** `propertyValue = mortgage * 1.35` | P1 | Wrong net worth for every homeowner | E23 | `Property` account type | Heavy persona: net worth includes £260k BTL plus home | V / R |
| D20 | Mortgage term never saved | No column anywhere. `_index.tsx:139-141` sets term to null. `MortgageContainer.tsx:115-135` only saves the rate (and through the 404 in D03) | P1 | The mortgage simulators cannot work | E23 | `term_months` on the mortgage account | Contract test plus mortgage loader test | V / R |
| D21 | Pension contributions double counted (£2,758/mo) | `PensionForecasterCard.tsx:320` computes `totalMonthly = monthlyEmployee + monthlyEmployer + directMonthlyContrib`, where the profile percentage (`PensionContainer.tsx:235-246`) and per-pot contributions (`:181-185`) can describe the same money | P1 | Pension forecast overstated | E23 | Decision D-8 (which is canonical) | Gareth and heavy personas | V |
| D22 | C-16 history wrong; check-in edits ignored (new) | `portfolio.ts:158-165`: the **latest history row overrides `account.balance`**, so a PATCHed balance has no effect on any account with history. `:320-376` has no carry-forward. No unique key in `account-detail.entity.ts`, so duplicates are summed. `:131-133` silently uses year 2025 and month 1 | P1 | Net-worth chart dips and spikes; check-in looks like it did nothing | E23 | Section 6 | Engine property tests plus a contract test | V |
| D23 | Check-in writes no history and N submits race | `MonthlyBalanceCheckInDrawer.tsx:49-71`: N `fetcher.submit` calls on one fetcher; success after 1.2s regardless. `account-intake.service.ts:225-235` writes no detail row | P1 | Month two has no trend | E23 (T-FIX-5) | Batch endpoint plus history upsert | Contract plus Playwright | V / R |
| D24 | C-17: failed balance call writes 0 | `providers/monzo.provider.ts:75-89`, `starling.provider.ts:90-106` (`balance = 0` on failure). `finance.service.ts:387-452` saves it and the month's detail row | P1 (bank beta only) | A transient error zeroes a real account and its history | E23 | `balance: number \| null`; skip the write; mark the connection partial | Provider and service spec with a failing fetch | V |
| D25 | B-05: decimals arrive as strings | Only `budget-entry.entity.ts:23-32` has a transformer. `GET /tax-records` (`tax.controller.ts:56-63`) and `/account-details` (`account-intake.service.ts:177-205`) return raw numerics. Consumers defend with `Number()` everywhere | P2 (latent) | String concatenation bugs; type lies | E21 (E23 does it first if D-9 says so) | Shared `numericTransformer` on all decimal columns | Postgres contract test asserts `typeof === "number"` | V in code; string shape is I (pg default) |
| D26 | Invented profile defaults at DB level | `user-profile.entity.ts:136-189` and Baseline migration line 27: pension 5% / employer 3% / salary sacrifice true / savings 5%; `user-profile.service.ts:98-131, 254-260` | P1 | "Assumed" rates look like user data (PensionContainer.tsx:217-221 even guesses at this) | E23 | Expand/contract to nullable columns | Contract: a new profile has nulls | V |
| D27 | Invented growth rates | `ForecastWidget.tsx:50` (6%); `portfolio.ts:261` (`getWeightedSavingsRate` default 5); `PensionContainer.tsx:190` (5%, flagged as placeholder) | P2 | Projections shown as fact | E23 / E15 | Label as an assumption, or Not set | Snapshot | V |
| D28 | B-07: hand-written amortisation and future-value maths in apps | `MortgageTracker.tsx:69`, `OverpayVsSaveCompare.tsx:67`, `OverpaymentSimulator.tsx:46`, `RemortgageShockSim.tsx:61`, `utils/mortgagePayment.ts:16`, `dashboard/widgets/MortgageWidget.tsx:76`, `ForecastWidget.tsx:60`, `SavingsWidget.tsx:61`, `PensionQuickStartWizard.tsx:125`, `SavingsQuickStartWizard.tsx:75-83`, `PensionForecasterCard.tsx:349`, `packages/ui/.../MortgageVsIsaCalculator.tsx:38`; mobile `MortgageScreen.tsx:130` (E12, do not fix) | P1 | Drift between surfaces | E23 (E4 T15/T17) | Engine functions plus `scripts/check-no-local-finance-math.ts` ratchet | Guard script test | V |
| D29 | Two tax-year bucketing rules and a silent rate fallback | `tax-calculator.ts:161-192` (6 April vs calendar month, documented "known issue (f)"); `tax-rules.ts:1127-1133` silently falls back to 2026/27 | P2 now, P1 from 6 Apr 2027 | Wrong year near 5 April; 2027/28 users silently get 2026/27 rates | E22 | E22 runbook and banner; E23 uses one selector | E22 fake-timer test | V |
| D30 | E4 vectors unsigned | `uk-tax.vectors.test.ts:25-31, :134-141` | Gate | Tax figures cannot be called verified | E4 / E22 (owner) | Section 10 | Test flips to "signed vectors are non-null" | V |
| D31 | Onboarding double-writes a client baseline | `app.onboarding.tsx:282-312` calls `updateBaseline` into localStorage, which becomes a second source of truth (feeds D13) | P1 | Stale figures after a DB change (observed G-10) | E23 | Drop the write; store is what-if only | Unit test | V |
| D32 | Debt total computed twice | `DebtContainer.tsx:113-114` vs `utils/debtSummary.ts:28-29` | P2 | Drift risk | E23 | Selector | Consistency test | V |
| D33 | MCP resource hard-codes Scottish bands and student loans | `mcp/src/resources/baseline.resource.ts:94-100, 109-114` (per E4 T8 and E16 plan) | P2 | Drift | E17 | Engine rules | E17 surface snapshot | Reported; not re-read by me |

**Stale or fixed since the audit (V):**
- C-08, C-13, C-14 and the trap engine fields (E4 merged).
- Mortgage 150k / 25y / 4.5% defaults (`ae3db96`).
- Onboarding pre-filled values (`55ba225`).
- The tax-record 1 April default (`e8f018e`).
- The pension 45k default on the Pension page (`3852ac7`).
- "Plan 2 thresholds wrong" is stale.
- "Four tax years stacking" is still live (D16).

---

## 2. Single source of truth for derived figures

### 2.1 Design

There is one engine module, `packages/finance-engine/src/picture/`, plus one backend read endpoint. This is **the same thing as E17 T1.1 `buildFinancialPicture`** (E17-plan-draft.md:229, 500). E23 builds it; E17 consumes it for MCP. It must not be built twice.

- `picture/figure.ts`:
  ```
  type Figure<T> =
    | { status: "known"; value: T; provenance: "user" | "derived" | "assumption"; assumptions?: string[] }
    | { status: "unknown"; missing: FieldKey[]; reason?: "not-set" | "source-failed" | "unsupported-year" }
  ```
- `picture/input.ts`: `FinancialPictureInput = { profile: ProfileFacts; accounts: RawAccount[]; details: RawAccountDetail[]; budget: BudgetEntry[]; taxRecords: TaxRecord[]; failedSources?: string[] }`. Facts are nullable and there is **no `DEFAULT_FINANCIAL_BASELINE` spread**.
- `picture/selectors/*.ts`. These are pure, each in its own file, each with a colocated test:
  - `selectActiveTaxYear(now, override?)`: uses `resolveUkTaxYear`; returns `unknown(reason: "unsupported-year")` instead of throwing (E22 shows the banner).
  - `selectTakeHome`: wraps `calculateUkTax`, which is region-aware. Uses region, plans, pension, salary sacrifice and employment type. Gives monthly and annual figures plus a breakdown.
  - `selectMarginalRate` and `selectTrap`: return `incomeTaxRatePct` and `effectiveRatePct` (D7-a), plus escape contribution and saving.
  - `selectBudgetTotals`: income, essentials, savings, discretionary.
  - `selectSurplus`.
  - `selectSafeToSpend`: one formula (D-6).
  - `selectNetWorth`: total, by category, liquid. Includes property; student loan per D-5.
  - `selectDebtTotals`: consumer debt (payoff set), mortgage, student loan, overdraft.
  - `selectRunway`: liquid / essentials.
  - `selectPensionContributions`: per D-8.
  - `selectTaxDue(year)`: D4-b; null when there is no data.
  - `selectNetWorthHistory`: carry-forward.
- `buildFinancialPicture(input, { now, taxYear? })` returns `{ values: Record<FigureKey, Figure>, completeness, missing[] }`.
- Backend: `GET /financial-picture` (versioned per E21 once that exists) in a new `FinancialPictureService`. It reads repositories in-process, maps rows through the numeric transformer and calls the engine. MCP's `AgentDataService` (E17) calls the same service in-process. Mobile (E12) calls the endpoint.
- Web: loaders fetch `/financial-picture` once (SSR). Client-side what-if sliders call the **same selectors** with overrides, e.g. `selectTakeHome({ ...facts, pensionPct: slider })`, and never local formulas.
- Rendering contract: every rendered derived figure carries `data-figure="<key>"`, for example `takeHome.monthly`. That one hook serves both the consistency tests and Playwright.

### 2.2 Duplicated implementations to remove (V), in migration order

| Figure | Current implementations | Replace with | Notes |
|---|---|---|---|
| Take-home | `_index.tsx:157-166` → `UserProfilePanel.tsx:185-240` (`calculateNetTakeHome`, maths exported from a component); `PensionContainer.tsx:258-271`; `UKTaxCalculator.tsx:55,74,718`; `app.onboarding.tsx:209` (`calculateUkTax`); `ai-context-pack.ts:205-208` (0.72); stored `profile.monthlyTakeHome`; budget "income" row | `selectTakeHome` | Two engine paths also disagree on rounding and region: `calculateUKEWNITakeHome` (`tax-rules.ts:1120`) and `calculateUkTax` (`uk-tax.ts:383`). Selector uses `calculateUkTax`; deprecate the other in the web |
| Marginal / trap | `PensionContainer.tsx:353-355` (`calculate100kTaxTrap`) plus hard-coded copy; `TaxTrapAlertBanner.tsx:49,114,127,139`; `WealthCheckHeroWidget.tsx:238` (**E16 cut, skip**); `packages/ui TaxTrapCalculator.tsx:27`; `mcp uk-tax-trap.tool.ts:72-84` | `selectTrap` | The ui calculator stays signed-out and stateless but calls the same engine function |
| Safe-to-spend | `HomeDashboard.tsx:99-105`; `BudgetDashboard.tsx:133-161`; `ai-context-pack.ts:216-221`; `financial-audit.tool.ts:101` | `selectSafeToSpend` | |
| Runway | `utils/runwayStorage.ts:78` (localStorage settings); `_index.tsx:174-179`; `BudgetDashboard.tsx:175`; `BudgetWidget.tsx:69`; `ai-context-pack.ts:223-225` | `selectRunway` | RunwayCalculator is demoted to one card (E16 T-DEMOTE-2): do not fix the calculator |
| Budget totals | `_index.tsx:74-95`; `BudgetDashboard.tsx` totals; `ai-context-pack.ts:180-203` (its own `toMonthly`) | `selectBudgetTotals` | |
| Net worth / totals | `_index.tsx:69-72, 98-104` (typeTotals abs); engine `PortfolioSnapshot` (already shared by backend `account-intake.service.ts:250-268`, MCP and web) | `selectNetWorth` (built on a fixed `PortfolioSnapshot`) | Mostly single-source already; the fix is in the engine |
| Debt totals | `utils/debtSummary.ts`; `DebtContainer.tsx:113-114`; `financial-audit.tool.ts:80-82` | `selectDebtTotals` | |
| Tax due / tax year | `_index.tsx:144-152, 252`; `TaxContainer.tsx:66-115, 256-262` | `selectTaxDue`, `selectActiveTaxYear` | |
| Pension contributions | `PensionContainer.tsx:181-246`; `PensionForecasterCard.tsx:316-352` | `selectPensionContributions` plus engine future-value | |
| Future value / amortisation | The 12 web/ui sites in D28 | Engine `mortgage.ts` and a new `projectFutureValue` | E4 T15a/b |
| Client baseline as a source | `state/baseline.store.ts`; `TaxContainer.tsx:74-83`; `PensionContainer.tsx:349-351`; `app.onboarding.tsx:282-312` | Server picture; the store becomes overrides only | |

---

## 3. Profile and asset data model

### 3.1 Schema

Shapes are proposals. Expand and contract. Every new column is **nullable with no default**, and null means "Not set".

`user_profiles`, migration `apps/backend/src/migrations/ProfileFacts<ts>.ts`:
- `tax_region varchar NULL`, with `CHECK (tax_region IN ('ENGLAND','WALES','SCOTLAND','NORTHERN_IRELAND')) NOT VALID` followed by `VALIDATE`. Four values are stored; the engine maps three of them to `ENGLAND_NI_WALES`. This keeps Welsh rates possible later at no cost.
- `date_of_birth date NULL`, or `birth_year smallint` (decision D-3). Age is derived.
- `student_loan_plans text NULL` (simple-array of `PLAN_1|PLAN_2|PLAN_4|PLAN_5|POSTGRAD`). It is an array because a postgraduate loan repays alongside plan loans (I: the engine's support for concurrent plans must be checked against vectors).
- `housing_status varchar NULL`, `monthly_housing_cost numeric(12,2) NULL`, `monthly_other_outgoings numeric(12,2) NULL`.
- Contract step for the invented defaults (D26): `ALTER COLUMN pension_percent DROP DEFAULT, DROP NOT NULL` (likewise `pension_employer_percent`, `is_salary_sacrifice`, `savings_default_interest_rate`). Existing rows cannot be told apart from user choices, so add `pension_rates_confirmed boolean NULL` and treat an exact 5/3 pair with a null flag as "assumed". That is the existing heuristic in `PensionContainer.tsx:217-221`, moved into the picture.
- Not added to the profile: cash, pension pot, unsecured debt, mortgage balance, home value. Onboarding creates **account rows** for these (it already does for cash, pot, mortgage and cards at `app.onboarding.tsx:358-366`), so there is one store for balances.

`accounts`:
- `type` gains `'Property'`, `'Student Loan'` and `'Overdraft'` (the varchar needs no DDL; update the TS unions in `account.entity.ts:17-25`, `account-intake.service.ts:14-22` and `portfolio.ts:3-17`).
- `term_months integer NULL` and `fixed_rate_end_date date NULL` (mortgage).
- `student_loan_plan varchar NULL`.
- `currency` gets `DEFAULT 'GBP'` (safe metadata change).

`account_details`: dedupe migration (keep the max id per `(account_id, year, month)`), then a `UNIQUE (account_id, year, month)` index.

`tax_records`: no DDL. D16 is semantics plus a data backfill (decision D-7).

**Railway safety (V for mechanics, I for timings):**
- Migrations run at boot with a lock (`config/migration-lock.ts`, `typeorm.options.ts:65-67`).
- Adding a nullable column without a default is metadata-only in PostgreSQL. `DROP DEFAULT` and `DROP NOT NULL` do not rewrite the table. The CHECK uses `NOT VALID` then `VALIDATE`.
- Tables are tiny (the owner's account plus test data, per DECISIONS E2), so the in-transaction unique index is fine. If they grow, use `transaction = false` with `CREATE UNIQUE INDEX CONCURRENTLY`.
- Prerequisites: a manual backup and restore drill (E18) before the first E23 migration, and staging first when it exists.
- Every migration gets an entry in `migrations.integration.spec.ts`, including `down()`, and runs in CI on Postgres 18.
- The contract step (dropping old fields from the web payloads) waits one release.

### 3.2 API

- `PATCH /user-profile` accepts the new fields with validation (a zod schema in this task; E21 later generalises it). `GET` returns them as `null` when not set.
- `formatProfile` (`user-profile.service.ts:54-140`) stops inventing values (`5.0`, `3.0`, `true`, the enabledPages default).
- `POST/PATCH /accounts` accepts `termMonths`, `fixedRateEndDate` and `studentLoanPlan`.
- New `PATCH /accounts/balances` (batch check-in, transactional, writes history).
- New `GET /financial-picture`.

### 3.3 Onboarding capture (E16 target: at most 6 required inputs)

- Step 1 asks: employment, salary, region, student loan plans (multi-select with "None"), and age (optional).
- Housing status and cost are optional.
- Balances become account rows, created only when entered (that behaviour is already on main from `55ba225`).
- Retry and dedupe are fixed (D02b).
- `updateBaseline` is removed (D31).

### 3.4 Defaults policy

1. No fabricated defaults in storage, the API or the engine.
2. The engine never throws for a missing fact. Selectors return `unknown` with `missing[]`.
3. An **assumption** is allowed only when labelled (`provenance: "assumption"`, with an `assumptions[]` sentence). The only proposed assumption is region: unknown region computes England rates labelled "Assumed England, Wales or NI rates: set your region" (decision D-4).
4. The UI renders `unknown` as "Not set" with a call to action, never £0. That is E15 T2.3's `Money` "Not set" state. Until it lands, an interim tested helper renders the text with `tabular-nums` at each touched site.
5. MCP returns `missing[]` with an `askUser` sentence (E17 6.1).

This feeds E17 directly (the picture is its read model) and E15 (it defines exactly which figure keys can be `unknown`).

---

## 4. Tax-year handling (coordinate with E22)

- One record rule: `getTaxYearForRecordDate` (calendar month, as documented) for filing records; `getUkTaxYearForDate` for real calendar events. `selectActiveTaxYear` is the only "current year" consumers use. Home filters records to it (D15).
- Multi-year ledgers depend on D-7:
  - (a) "annual" means "an annual figure for the tax year starting at `date`", with `endDate` implied as the end of that year. Existing annual rows get `end_date` backfilled by a migration.
  - (b) keep "recurring" and add a new `annual-once` frequency.
  - Either way, the heavy persona's 28 records must produce four separate years, not one stacked year.
- Unknown or unsupported years: the selector returns `unknown(reason:"unsupported-year")` and E22 owns the banner, the runbook and removing the silent fallback at `tax-rules.ts:1127-1133`. E23 must not change resolver behaviour on its own; it only consumes it.
- The 6 April boundary is tested via fake timers in the persona suite on 5 and 6 April 2027 (this overlaps E22's test, so share the fixture).

---

## 5. Liabilities and signs

E4 D2-a is decided. The canonical convention in the engine:
- `ResolvedAccount.signedBalance` is the asset's real sign (overdrawn current is negative), and `-owed` for liabilities.
- `owedGbp` and `nominalBalance` are magnitudes for display only.
- `PortfolioSnapshot` stops using `abs` (`portfolio.ts:167, 336`); banking `normalizeAccountBalance` keeps asset signs (`orchestrator.ts:187-200`, test `orchestrator.test.ts:22-33` changes to -1500).
- Storage stays as entered for manual accounts today. The engine normalises liabilities by type, so stored sign does not matter for liabilities and only matters for assets. That makes a data migration unnecessary (I: verify there are no negative manual liability rows in prod with a read-only count first).

| Kind | Stored type | Net worth | Consumer debt total | Debt payoff (avalanche/snowball) | Notes |
|---|---|---|---|---|---|
| Current, overdrawn | `Current` (negative) or `Overdraft` | Yes (negative) | **Yes**, as the overdraft portion | Yes, `debtType: overdraft` | Fixes "overdraft missing" |
| Credit card / loan / car / BNPL / owed | existing | Yes | Yes | Yes | |
| Mortgage | `Mortgage` (+`term_months`) | Yes | No (own total) | No (Mortgage page) | |
| Student loan | **`Student Loan`** + plan | Decision D-5 | **No** | **No**; repayment is a payroll deduction inside take-home | Fixes D18 |
| Property | **`Property`** | Yes (asset, not liquid) | n/a | n/a | Fixes D19; the invented `mortgage*1.35` goes |
| Pension / investment / savings | existing | Yes | n/a | n/a | Liquid = cash + savings only |
| Card in credit | liability type, positive provider value | Asset-side positive | No | No | Per D2-a |

---

## 6. History and check-in correctness

- `accounts.balance` is "now". `account_details` are month-end snapshots, unique per (account, year, month).
- `PortfolioSnapshot` uses `balance` for the current figure and history only for past months. This fixes the override bug at `portfolio.ts:158-165`.
- `getMonthlyHistory` carries the last known value forward for each account (C-16), rejects rows without a year or month instead of defaulting them, and uses no `abs`.
- `updateAccount` and the new batch `PATCH /accounts/balances` upsert the current month's detail row in the same DB transaction when the balance changes.
- The check-in drawer makes one submit. It shows success only on a 2xx and shows the delta ("Net worth up £N since <last month>") from `selectNetWorthHistory`.
- G-04: under E16 D12-B the edit UI is removed (T-CUT-4, owned by E16). E23 adds nothing back; the route inventory test keeps missing endpoints out.
- Property and pension accounts take part in the check-in, so net worth over time includes them.

---

## 7. Decimals and money arithmetic

| Option | Description | Cost | Risk |
|---|---|---|---|
| A | Keep pounds as floats. One `numericTransformer` on every `decimal` column (about 20 across 5 entities) so the API returns numbers. `roundPence` only at result boundaries (E4 D5-a, already decided). Property tests check invariants to within 0.01 | S (about 1 day) | Float drift far below a penny at these magnitudes (I) |
| B | Integer pence inside the engine, converted at the API boundary | L (2 to 3 weeks; about 160 `Math.round` sites, per E4) | Broad churn, little user-visible gain |
| C | decimal.js in the engine | M/L, plus a new dependency | Performance and ergonomics |

**Recommendation: A.** It is already decided for the engine. The transformer is E21's B-05, but E23 needs it for the Postgres contract test, so E23 does it (decision D-9) and E21 adopts it. The rest of E21 (zod, OpenAPI, versioning) stays with E21.

---

## 8. Partial-failure behaviour

- C-17: providers return `balance: number | null` and a `balanceError`. `finance.service.ts:387-452` skips the balance update and the detail write when the balance is null, and sets connection `status = "partial"` with a sanitised `lastSyncError`. Tests use a fetch stub that returns 500 and that throws.
- Picture sections: when a source endpoint fails, the backend passes `failedSources`. Dependent figures become `unknown(reason:"source-failed")`, never £0. This is consistent with E5 D2-A (whole-route error) and lets a later E5 D2-B work section by section.
- Sync errors are never shown as balances. The history row for that month is left untouched.

---

## 9. Regression guard strategy

### 9.1 Persona fixtures

New: `packages/finance-engine/src/picture/__fixtures__/personas/<name>.ts`, holding input rows, plus `expected/<name>.json`, holding hand-derived outputs with a derivation note per value. Tax parts may only assert values backed by **signed-off** vectors. Unsigned values assert `status`, not amount, as E17 does.

| Persona | Key facts | Guards |
|---|---|---|
| P1 Sam | 29, £38k PAYE, Plan 2, renting, England | Student loan in take-home; not in payoff |
| P2 Priya | £112k, salary sacrifice, mortgage, 2 children | Trap: 60/62 named; take-home single value |
| Trap edge | exactly £100,000 / £112,570 / £125,140 | Boundaries |
| Scottish | £50k, SCOTLAND, 2026/27 | Region (vector tax 8,982.05) |
| P3 Gareth | 52, SIPP and ISA, mortgage near end, per-pot contributions | D21, mortgage term |
| P4 Dan | PAYE plus BTL, SA records over 2 years | D16, Section 24, tax due |
| P6 debt-stressed | cards plus -£640 overdraft | C-15, debt total |
| Heavy | £118k, 17 accounts, 22 budget entries, 28 tax records over 4 years (from E16 journeys) | Everything at once |
| New user | only salary | Every other figure `unknown`, nothing invented |

### 9.2 Cross-page consistency tests

- **Engine level:** for each persona, `buildFinancialPicture` equals `expected`.
- **Web level:** `apps/web/app/test/consistency/consistency.test.tsx`, a new shared test harness (not a component, so the colocation law does not apply). For each persona it mocks `backendFetch` with fixture rows (and `/financial-picture` with the engine output), renders the Home, Budget, Pension, Tax, Debt and Mortgage route components, collects `[data-figure]` text by key, parses it en-GB, and asserts every surface agrees and equals the engine value.
- **Target:** 9 personas × about 10 keys × surfaces, roughly **150 to 200 assertions**.
- **MCP:** the same personas through the picture (E17 T7.2 reuses the fixtures).

### 9.3 Web-to-backend contract test on real Postgres

- `apps/backend/test/contract/web-mutations.contract.spec.ts`:
  - New devDependencies: `@nestjs/testing` and `supertest`. Neither is in `apps/backend/package.json` (V).
  - Boots the real `AppModule` against `TEST_DATABASE_URL` with migrations, `NODE_ENV=development` and `AUTH_DEV_BYPASS=true`. It is guarded by `assertSafeTestDatabase` and `resolveDbTestMode`, so it runs in the existing CI vitest job with its Postgres service (`ci-pipeline.yml:102-119`).
- **Payload fixtures:** `apps/backend/test/contract/web-payloads.ts` lists every web mutation. There are 28 call sites (`rg 'method: "(POST|PATCH|PUT|DELETE)"' apps/web/app`) covering about 20 endpoint and method pairs, including onboarding, accounts create/update/delete, debt, pension (4), savings (3), budget CRUD and seed-defaults, profile PATCH and checklist, tax CRUD and bulk, and mortgage PATCH.
- **Keeping payloads honest:** each payload has a twin web test asserting the web still sends that exact shape (a consumer-driven pair). The pair is replaced by shared zod schemas when E21 lands.
- **Assertions:** status 2xx, the GET round-trip preserves every field, and decimals come back as `number`.
- **Route inventory test:** `apps/backend/test/contract/route-inventory.spec.ts` statically extracts `(method, path)` pairs from `backendFetch`/`apiFetch` call sites in `apps/web/app`, and from `apps/mobile-companion/src/api/client.ts` as report-only. It asserts each matches a route registered on the booted Nest app. This would have caught D03, D04 and D05. It is the G-unfinished.md:245 recommendation.

### 9.4 Playwright smoke suite

This follows E11 T18/T19 (E11-plan-draft.md:340-352).

- New workspace `apps/e2e` (`@playwright/test`, Chromium only).
- `playwright.config.ts` has `webServer` entries for the backend and for web as a production build (`bun run build` then start; the dev server has the hydration bug). Both run with `NODE_ENV=development AUTH_DEV_BYPASS=true`, no `WORKOS_*`, and `DATABASE_URL` set to the CI Postgres service.
- The dev bypass is a single fixed user, so `globalSetup` truncates user tables through a `pg` client after `assertSafeTestDatabase`.
- Specs:
  - `onboarding.spec.ts`: Finish lands on Home; take-home equals the engine value for the typed inputs.
  - `accounts.spec.ts`: add current, savings and card.
  - `budget.spec.ts`
  - `dashboard-totals.spec.ts`: net worth and debt via `data-figure`.
  - `checkin.spec.ts`: balance change shows a delta and a history point.
  - `mortgage-term.spec.ts`
- CI job `e2e`:
  - Postgres service; `paths` filter (`apps/web/**`, `apps/backend/**`, `packages/finance-engine/**`, `packages/ui/**`, `apps/e2e/**`) on PRs and on push to main.
  - 1 worker, `retries: 1`, `trace: on-first-retry`.
  - Artifacts on failure: `playwright-report/` and traces, `retention-days: 7`.
  - Cache `~/.cache/ms-playwright` keyed on the Playwright version.
  - Advisory, not required (DECISIONS E11 D7: no branch protection).
- **Budget:** about 7 to 9 minutes per run (I). At about 50 filtered runs a month, roughly 400 of the private repo's 2,000 free minutes. Measure the actual monthly use with `gh api /repos/:owner/:repo/actions/runs` before turning it on, and drop push-to-main runs if the budget is tight.
- WorkOS test mode is out of scope for now (decision D-10).

### 9.5 Property-based tests

`fast-check` as a new devDependency in finance-engine (decision D-11; the alternative is deterministic sweeps as E4 used). Properties:
- Net worth = Σ signed balances.
- Moving £x between two asset accounts leaves net worth unchanged.
- Adding a liability of x lowers net worth by exactly x.
- Overdrawn current: net worth lowers by |x| and consumer debt rises by |x|.
- Carry-forward: history at month m = Σ last known values at or before m.
- `selectSafeToSpend` is in [0, income].
- `selectTakeHome` is monotonic in gross, and net + deductions = gross (to 0.01).
- Every ISO date maps to exactly one tax year; 5 and 6 April split.
- `toMonthly` and annual round-trip to within 0.01.

---

## 10. E4 leftovers (coordinate with E22)

- Sign-off workflow:
  1. The owner ticks vectors in `packages/finance-engine/docs/tax-vector-signoff.md`.
  2. A small script, `packages/finance-engine/scripts/apply-signoff.ts` (E22 owns it; E23 may draft it), writes `signedOffBy: "owner"` and `signedOffAt` into `uk-tax.vectors.ts`.
  3. The catalogue test at `uk-tax.vectors.test.ts:25-31` changes from "always null" to: signed vectors carry a name and date and are VERIFIED; unsigned ones stay medium or UNVERIFIED. The Scottish Gift Aid block at `:134-141` stays UNVERIFIED until the D9 ruling.
- E23 dependency:
  - Persona tax expectations assert amounts only for signed vectors.
  - Surfaces label tax figures "estimate (rates not yet verified)" until the year is fully signed. The picture carries a `verification` flag per tax year, as E17 needs too.
  - P0 does not wait for sign-off; P1 tax-figure tasks do.

---

## 11. Phases and tasks

All tasks share these rules:
- Write the failing test first.
- Run the four checks: `rtk bun run lint && rtk bun run check-types && rtk bun run test && rtk bun run build`.
- Reference the finding ID in the PR.
- Spawn implementers with `agentType: implementer` (sonnet) or `explorer` (haiku), per AGENTS law 6.
- Land after PR 386 (E8 sweeps) for any `apps/web/app` edit.

DB tests run with `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e23_test REQUIRE_DB_TESTS=1`.

### Phase 0: before release PR 368

| ID | Task | Files | Acceptance and verification | Effort | Depends on | Model | Risk |
|---|---|---|---|---|---|---|---|
| P0-1 | Hide C-11 | `apps/web/app/routes/_index.tsx:144-152,251-258`, `components/dashboard/widgets/TaxWidget.tsx:181-192`, `HomeDashboard.test.tsx:122`, TaxWidget story | `estimatedTaxDue: null`; the widget shows "Not calculated yet" (tabular-nums kept). No `0.29` in apps (`rg -n '0\.29' apps/web/app` returns empty). `rtk bun run --cwd apps/web test -- _index TaxWidget` | S | none | sonnet | Low |
| P0-2 | Route inventory guard, plus fix D04 (or hand it to the in-flight session) | `apps/backend/test/contract/route-inventory.spec.ts` (new), `finance.controller.ts:165-166` | Test fails on main for PATCH `/accounts/:id`, POST `.../refresh` and the 3 G-04 paths. G-04 paths sit on an explicit, dated allow-list until E16 T-CUT-4. `rtk bun run --cwd apps/backend test -- route-inventory` | M | in-flight T-FIX-1 merged (or `expect.fail` list) | sonnet | Regex extraction misses dynamic paths: keep a known-dynamic allow-list |
| P0-3 | Postgres contract test for the onboarding, accounts and budget mutations | `apps/backend/test/contract/web-mutations.contract.spec.ts`, `web-payloads.ts`, `apps/backend/package.json` (devDependencies), web twin tests in `app.onboarding.test.tsx` | Onboarding payloads (5 accounts, 3 budget entries, profile) give 2xx and round-trip; D02b covered. `TEST_DATABASE_URL=… REQUIRE_DB_TESTS=1 rtk bun run --cwd apps/backend test -- contract` | M | in-flight fixes | sonnet | Boot time in CI; dev bypass in tests |
| P0-4 | No gross-as-take-home; no £45k | `UserProfilePanel.tsx:185-215`, `_index.tsx:154-166`, `TaxContainer.tsx:74-95`, `state/baseline.store.ts:76-86`, `hooks/useUserProfile.ts:270-280`, `UKTaxCalculator.tsx:32` plus tests | Null employment gives a "Not set" take-home. A missing salary renders "Not set" on Home, Tax and the calculator. SSR never shows 45,000. `rtk bun run --cwd apps/web test -- TaxContainer _index baseline` | M | none | sonnet | `UKTaxCalculator` is due for a merge (E16 F06): change only the default |
| P0-5 | Trap copy consistent | `PensionContainer.tsx:372-433`, `components/tax/TaxTrapAlertBanner.tsx:110-145` plus tests | Copy reads both D7-a fields: "60% income tax, 62% including NI". No literal "60%" or "62%" in JSX (`rg -n '6[02]%' apps/web/app/components/tax apps/web/app/containers/pension`). Stories in light and dark | S | none | sonnet | Owner wording |

**P0 total: about 3 to 4 agent-days.**

### Phase 1: month 1, before PR 368 goes to production

| ID | Task | Files | Acceptance | Effort | Depends on | Model | Risk |
|---|---|---|---|---|---|---|---|
| P1-1 | Numeric transformer (B-05) | `apps/backend/src/entities/numeric.transformer.ts` (new), all entities with decimal columns, remove ad-hoc `Number()` in services | Contract test: every decimal is `typeof number` | S | P0-3, D-9 | sonnet | Null handling (null must stay null, unlike budget's `→ 0`) |
| P1-2 | Profile facts migration plus API | `migrations/ProfileFacts*.ts`, `user-profile.entity.ts`, `user-profile.service.ts:54-342`, `migrations.integration.spec.ts`, `migration-files.spec.ts`, zod schema in the controller | Up and down on Postgres; PATCH/GET round-trip; new profile has nulls (D26) | M | backup (E18), D-3, D-4 | sonnet | Prod migration at boot; staging first |
| P1-3 | Account types and columns | migration, `account.entity.ts`, `account-intake.service.ts`, `portfolio.ts:3-26,86-110` | Property, Student Loan, Overdraft categories; `term_months`; currency default | M | P1-2 | sonnet | Unions in several packages |
| P1-4 | Engine picture core plus selectors | `packages/finance-engine/src/picture/**` (new), `index.ts` | Table tests per selector; "no default unless assumption" property | L | E4 sign-off for tax amounts only | sonnet | Shared with E17 T1.1: agree on the interface first |
| P1-5 | PortfolioSnapshot fixes (C-15, C-16, D22) plus banking sign (F-02) | `portfolio.ts:120-197, 320-376`, `portfolio.test.ts`, `packages/banking/src/server/orchestrator.ts:187-200`, `orchestrator.test.ts:22-33`, `core/sign-enforcement.ts` | F-02 at -1500; the section 9.5 properties pass | M | P1-3 | sonnet | Display regressions where abs was relied on (`_index.tsx:102`, `BudgetDashboard` `fmt`) |
| P1-6 | Persona fixtures plus expected values | `picture/__fixtures__/**` | Owner reviews `expected/*.json` (about 2 to 3 hours) | M | P1-4 | sonnet (haiku for data entry) | Expected values wrong: derivation notes plus review |
| P1-7 | `GET /financial-picture` | `apps/backend/src/financial-picture.{service,controller}.ts` plus spec, `app.module.ts` | Persona rows in Postgres give the engine `expected` | M | P1-1, P1-4 | sonnet | Auth and ownership: use `req.user.id` only |
| P1-8 | Onboarding capture | `app.onboarding.tsx` (region, plans, age; drop `updateBaseline` at 282-312) | 6 or fewer required inputs; Playwright onboarding green | M | P1-2 | sonnet | Law 1: new inputs use existing components; E15 redesign later |
| P1-9 | Migrate Home and Budget to the picture | `_index.tsx`, `HomeDashboard.tsx:85-105`, `BudgetDashboard.tsx:125-190`, `BudgetWidget.tsx` | `data-figure` on takeHome, safeToSpend, surplus, netWorth, debt, runway; consistency test green for Home and Budget | M | P1-7 | sonnet | Large files touched by E8, E15 and E16 |
| P1-10 | Migrate Pension, Tax, Debt, Mortgage | `PensionContainer.tsx`, `PensionForecasterCard.tsx:316-352`, `TaxContainer.tsx:66-262`, `DebtContainer.tsx:113-114`, `MortgageContainer.tsx` | Consistency test green on all; D21 per D-8; D20 term saved | L | P1-9, D-8 | sonnet | SimulatorSplitLayout (law 3) only where E15 is not already rebuilding |
| P1-11 | Tax-year semantics (D16) | `tax-calculator.ts:231-262`, migration backfilling `end_date` if D-7(a), `TaxContainer` | Heavy persona gives four separate years | M | D-7, E22 sync | sonnet | Changes stored data meaning: backup first |
| P1-12 | Check-in plus history (D22, D23) | `account-intake.service.ts:225-235` plus batch endpoint, `account_details` unique migration, `MonthlyBalanceCheckInDrawer.tsx` | One request; history row; delta shown; Playwright check-in green | M | P1-5 | sonnet | Duplicate cleanup in prod data |
| P1-13 | C-17 partial sync | `providers/monzo.provider.ts`, `starling.provider.ts`, `finance.service.ts:300-452` plus specs | Failing balance leaves the account and history untouched; status partial | S | none | sonnet | Bank beta only |
| P1-14 | Cross-page consistency harness | `apps/web/app/test/consistency/*` | ≥150 assertions green; fails if any surface computes locally | M | P1-9, P1-10 | sonnet | Mock drift: fixtures come from the engine |
| P1-15 | Playwright smoke plus CI job | `apps/e2e/**`, `.github/workflows/ci-pipeline.yml`, `turbo.json`, root `package.json` | 6 specs green locally (`rtk bun run --cwd apps/e2e test:e2e`) and in CI under 10 minutes; artifacts on failure | M | P0-3, P1-8, P1-12 | sonnet | Flakes; minute budget |
| P1-16 | Property tests | `picture/*.property.test.ts`, finance-engine devDependency | Section 9.5 properties | S | P1-4, P1-5 | sonnet | |
| P1-17 | C-11 real value | `selectTaxDue`, `_index.tsx`, `TaxWidget` | D4-b plus empty state; Dan persona | S | P1-4, E4 sign-off | sonnet | |

### Phase 2: after E16 cuts, alongside E17, E21 and E15

| ID | Task | Effort | Depends on | Model |
|---|---|---|---|---|
| P2-1 | B-07 web formulas to engine (D28; E4 T15a/b/c) for **kept** components only | M | E16 cuts | sonnet |
| P2-2 | `scripts/check-no-local-finance-math.ts` ratchet in `check:laws` (E4 T17), baseline at zero after P2-1 | S | P2-1 | sonnet |
| P2-3 | MCP adoption: `AgentDataService` reads `FinancialPictureService`; delete `userProfileToFinancialBaseline` defaults and stdio `DEFAULT_FINANCIAL_BASELINE` (E17 T0.3, T1.x) | M | P1-7 | sonnet |
| P2-4 | Context pack (`ai-context-pack.ts:180-302`) from the picture; remove the 0.72, £900 and £1,100 fallbacks | S | P1-4 | sonnet |
| P2-5 | Delete `calculateNetTakeHome` from `UserProfilePanel` and deprecate `calculateUKEWNITakeHome` in apps | S | P1-10 | haiku |
| P2-6 | Contract step: drop the profile defaults path and remove the old payload aliases (`title`) | S | one release after P1-2 | sonnet |
| P2-7 | Contract payload twins replaced by E21 zod schemas | S | E21 | sonnet |

**Estimated effort (I):**
- P0: 3 to 4 agent-days.
- P1: 28 to 36 agent-days, about 3 to 4 weeks elapsed with 2 worktrees, because the web files are shared and the work is serial.
- P2: 8 to 12 agent-days.
- Owner time: decisions about 2 hours; persona expected-value review 2 to 3 hours; E4 vector sign-off 4 to 8 hours (counted under E4, but it gates P1-4 amounts, P1-11 and P1-17).

---

## 12. AGENTS.md laws touched

| Law | Where |
|---|---|
| Law 1 (colocation) | No new components in P0/P1. The consistency harness is test infrastructure. The interim "Not set" helper reuses E15 T2.3 `Money` if it has landed; otherwise it goes in `packages/ui/src/primitives/NotSet/` with all five files. E23 does not restructure existing flat files (E9/E15 own that) |
| Law 2 (semantic tokens, tabular-nums, en-GB) | Every figure re-sourced (P0-1, P0-4, P0-5, P1-9, P1-10); "Not set" text keeps `tabular-nums`. The `check:laws` ratchet must not grow |
| Law 3 (KpiStrip, SimulatorSplitLayout, SliderField, CollapsibleDrawer) | Applies only if P1-10 changes layout; default is logic-only, with layout left to E15. The multi-year tax table stays as it is |
| Law 4 / 5 (definition of done, four checks) | Every task; stories in light and dark for TaxWidget, TaxTrapAlertBanner and the check-in drawer |
| Law 6 (subagent models) | Sonnet for implementation, haiku for fixture data entry and greps, opus only for this plan |
| Law 7 (rtk) | All commands |

---

## 13. Sequencing

**E16: do not fix pages it proposes to cut or merge.** Touch them only to stop false figures, never to improve them:
- F21 Forecast route (`app.forecast.tsx`, `ForecastContainer`): merge.
- F16 budget actuals block: cut.
- F29 account history edit UI: cut (`app.accounts.$account.tsx`, `AccountDetails`).
- F34 signed-out web home (`components/home/*`, including `InteractiveFinancialTeaser.tsx:262`): cut.
- F44 dead components: `WealthCheckHeroWidget`, `ScenarioLayersWidget`, `GlobalBaselineScenarioBar` plus scenario store, `SavingsQuickStartWizard`, `PromoCliffTracker`, FLP slider, spinner and table, `useDebtPayoffSchedule`.
- F37 country selector and Irish take-home (`UserProfilePanel.tsx:41-70,196-250`, the IE branch of `calculateNetTakeHome`).
- F43 childcare calculator.
- F18 Runway calculator: demote to one card fed by `selectRunway`.
- F22 stage hero: hide.
- F23 customisation: show/hide only.
- F24: widgets reduced to the core four, so ForecastWidget and SavingsWidget future-value work waits for that list.
- F27 and F30 bank OAuth and adapters.
- F06 UKTaxCalculator: merge into the Tax hub. Only the P0-4 default changes.

**Other epics:**
- **E15:** "Not set" rendering (T2.3) consumes the picture's `unknown`. E15 phase 3 redesigns pages after E23 re-sources them, so the order is E23 logic first, then E15 layout.
- **E21:** E23 seeds the contract test and the numeric transformer. E21 adds zod, OpenAPI, versioning and the typed client, and replaces the payload twins.
- **E17:** the picture is E17's read model. Agree the `Figure`/provenance shape in one short joint design note before P1-4.
- **E12:** the mobile rebuild reads `/financial-picture`. Do not fix the old app.
- **E22:** owns the resolver behaviour, the stale-rates banner and the sign-off script. E23 uses the `unsupported-year` reason.
- **E18:** backup, restore drill and staging before P1-2.
- **E19:** account deletion must cover the new columns and account types.
- **E20:** moving browser mutations into route actions changes which payloads the contract twins assert; re-run P0-3 after E20.
- Land after PR 386.

---

## 14. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Migrations at boot break production | M | H | Backup and drill (E18); nullable, metadata-only DDL; staging first; Postgres integration spec in CI |
| Conflicts with E8, E15 and E16 in `_index.tsx`, `HomeDashboard`, `TaxContainer` | H | M | Land after 386; logic-only diffs; one worktree owns the web hotspots at a time |
| Persona expected values are wrong, so the tests cement errors | M | H | Derivation per value; owner review; tax amounts only from signed vectors |
| Picture built twice (E17 vs E23) | M | M | One joint interface note; E23 owns the engine and E17 the MCP |
| Playwright flakiness or minute budget | M | M | Production build, 1 worker, retries 1, paths filter, advisory job; measure minutes first |
| Region assumption still feels like a default | M | M | Labelled assumption plus call to action (D-4); measure the share of profiles with region set |
| Data meaning change for "annual" tax records | M | H | D-7 with a backfill migration and a backup; Tax page notice |
| E4 sign-off slips | H | M | P0 is independent; tax-amount assertions are gated per year; surfaces say "estimate" |
| Hidden consumers of `abs` behaviour | M | M | Properties plus display-only `owedGbp`; grep `Math.abs` in apps |

---

## Decisions needed from the product owner

1. **D-1. Where does the single source of truth run?**
   - A. Engine selectors called in each web loader and component.
   - B. A backend `GET /financial-picture` built from the engine; web, MCP and mobile read it; client what-ifs call the same selectors with overrides.
   - C. Backend only, with no client recalculation (sliders round-trip to the server).
   - Recommendation: **B.** One server-computed answer for all clients, sliders stay instant, and it is E17's read model.
   - Blocks: P1-7, P1-9, P1-10.

2. **D-2. What ships before PR 368?**
   - A. P0-1 to P0-5 plus the in-flight fixes.
   - B. A plus C-15 (P1-5).
   - C. Only the in-flight fixes and hiding C-11.
   - Recommendation: **A.** Each item is small and removes an invented or contradictory figure. C-15 needs P1-3.
   - Blocks: P0 scope.

3. **D-3. How is age stored?**
   - A. `date_of_birth`.
   - B. `birth_year`.
   - C. `age` integer.
   - Recommendation: **B.** Enough for pension and state-pension horizons, minimal personal data, and it does not go stale like C.
   - Blocks: P1-2.

4. **D-4. When region is unknown?**
   - A. Compute England/Wales/NI rates labelled as an assumption, with a call to action.
   - B. Show "Not set" for every tax figure until region is chosen.
   - C. Make region required in onboarding and keep A for existing users.
   - Recommendation: **C.** One extra select at step 1, and existing users still see labelled figures.
   - Blocks: P1-2, P1-8.

5. **D-5. Student loan in net worth?**
   - A. Include it as a liability.
   - B. Exclude it from the headline and show it as a separate "income-contingent" line.
   - C. Include it with a toggle.
   - Recommendation: **B.** It behaves like a graduate tax and is written off. It never enters debt payoff under any option.
   - Blocks: P1-4, P1-5.

6. **D-6. Safe-to-spend definition?**
   - A. Take-home − essentials (housing, bills, essential budget rows) − debt minimums − planned savings, per week.
   - B. A without planned savings.
   - C. Budget income − all budgeted outgoings.
   - Recommendation: **A.** It matches "safe after commitments, including saving", and fixes the heavy persona's "saving counted as spending".
   - Blocks: P1-4, P1-9.

7. **D-7. What does an "annual" tax record mean?**
   - A. One annual amount for the tax year containing `date`, backfilling `end_date` on existing rows.
   - B. Keep "recurring yearly" and add a new frequency for a one-year annual figure.
   - C. Remove "annual" and use one-off totals.
   - Recommendation: **A.** It matches how users enter yearly salary records and fixes the stacking with one backfill (after a backup).
   - Blocks: P1-11.

8. **D-8. Pension contributions: which is canonical?**
   - A. Profile percentages for the workplace scheme; per-pot amounts only for personal or SIPP pots not linked to the workplace.
   - B. Per-pot amounts only.
   - C. The larger of the two.
   - Recommendation: **A,** with a "workplace pot" flag on one pension account.
   - Blocks: P1-10.

9. **D-9. Who does the numeric transformer (B-05)?**
   - A. E23 now (P1-1), and E21 adopts it.
   - B. Wait for E21.
   - C. A per-entity fix in E23 only for the columns it needs.
   - Recommendation: **A.** About one day, and it is needed for the Postgres contract test.
   - Blocks: P1-1.

10. **D-10. Sign-in for the E2E suite?**
    - A. Dev bypass on a local dev host in CI.
    - B. WorkOS test mode with staging credentials.
    - C. Both, B nightly.
    - Recommendation: **A now.** It needs no secrets. Revisit B once E18 staging exists.
    - Blocks: P1-15.

11. **D-11. How are property tests generated?**
    - A. `fast-check` (new devDependency).
    - B. Deterministic sweeps, as E4 did.
    - Recommendation: **A** for shrinking and failure cases on the portfolio and history properties; keep B for tax.
    - Blocks: P1-16.

---

## 15. Measurement

- **Consistency coverage:**
  - Number of `[data-figure]` keys × surfaces × personas asserted. Target ≥150 at P1 exit.
  - Number of local derived-maths sites (D28 plus section 2.2). Baseline about 30 (V count from the greps); target 0 for kept surfaces, enforced by P2-2.
- **Contract coverage:** web mutation call sites covered by the Postgres contract test. Baseline 0 of 28; target 28 of 28. Route inventory mismatches: baseline 5 (D03, D04 and 3 from G-04); target 0.
- **Defaults leakage:** occurrences of `DEFAULT_FINANCIAL_BASELINE` values in production paths. Baseline: `profile.ts`, `mcp.service.ts:96`, `stdio.ts:41`, `baseline.store.ts`. Target 0.
- **Defect escape rate:** correctness defects found after merge (prod, staging or owner testing) ÷ correctness defects fixed per month. Track via a `correctness-escape` label. Target: fewer than 1 a month after P1.
- **Profile completeness:** share of active profiles with region and student-loan plan set (server-side counts, no amounts, per E16 D9).
- **E2E health:** pass rate, flake rate (retries that passed) and minutes a month. Promote toward a Railway gate once it has had two weeks without flakes.

**Relevant paths:**
- `/Users/marcgallagher/personal/flump/docs/audit/EPICS.md` (E23 at lines 572-578)
- `/Users/marcgallagher/personal/flump/docs/audit/plans/E16-decision-pack.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/E16-journeys.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/E4-plan-draft.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/E17-plan-draft.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/DECISIONS.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/SEQUENCE.md`
- `/Users/marcgallagher/personal/flump/docs/audit/C-correctness.md`
