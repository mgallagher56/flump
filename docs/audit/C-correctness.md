# Track C: Correctness

Scope: `packages/finance-engine`, `packages/banking` core, backend services, number handling in `apps/web`. Method: code reading, plus throwaway scripts in the scratchpad that imported engine functions and compared them with hand-computed HMRC-style references. No product files were changed.

Confidence on tax tables: GOV.UK pages fetched on 2026-11-11 confirm the 2026/27 income tax bands (https://www.gov.uk/income-tax-rates), Scottish bands (https://www.gov.uk/scottish-income-tax), student loan thresholds (https://www.gov.uk/repaying-your-student-loan/what-you-pay) and employer and employee NI (https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027). High confidence for 2026/27. For 2025/26 values (student loan 26,065 / 28,470 / 32,745, employer NI 15% and 5,000 from April 2025) the pages did not show them, so those rest on my own knowledge: medium-high confidence, re-verify before fixing.

## Summary

The tax core has real, reproduced errors. There are three separate income tax implementations (`uk-tax.ts`, `tax-rules.ts`, `tax-calculator.ts`), and they disagree with each other and with HMRC for incomes above 100k. New users are also seeded with fabricated accounts and tax records that feed every total.

## Findings

### [C-01] EWNI income tax in uk-tax.ts is wrong above 100k (understated up to about 5k)

- Severity: P0
- Location: packages/finance-engine/src/uk-tax.ts:190-227 (`calculateEwniIncomeTax`), used by `calculateUkTax` (uk-tax.ts:392); consumers: web onboarding, InteractiveFinancialTeaser, `packages/mcp` uk-tax-trap tool, ai-context-pack.ts:260
- Evidence: higher band is computed as `min(income,125140) - max(50270, PA)`, so when the personal allowance is tapered the 40% band is not widened. Script results (2025/26): 110,000 gives 31,432 vs correct 33,432; 125,140 gives 37,488 vs correct 42,516 (HMRC figure); 150,000 gives 48,675 vs 53,703. Roughly 5,028 too low for everyone above 125,140.
- Impact: the 60% trap analysis, take-home and MCP answers understate tax for high earners, in the cohort the product targets.
- Recommendation: compute on taxable income after allowance (basic 37,700 band, higher to 125,140 taxable, additional above). Delete the duplicate implementations in favour of one, driven by `UK_EWNI_INCOME_TAX[taxYear]`. Add test vectors at 100k, 110k, 125,140, 150k.
- Effort: M

### [C-02] tax-rules.ts and tax-calculator.ts over-charge the additional rate (112,570 instead of 125,140)

- Severity: P0
- Location: packages/finance-engine/src/tax-rules.ts:1003-1013 (`calculateUKEWNIIncomeTaxOnTaxable`), tax-calculator.ts:634-647 (`calculateIncomeTaxForTaxable`) and 649-686 (dividend stack uses the same threshold); consumers: UKTaxCalculator, UserProfilePanel, PensionContainer, TaxContainer, mobile TaxScreen
- Evidence: `higherBandWidth = additionalRateThreshold - personalAllowance - basicRateBandWidth` (74,870) so 45% starts at taxable 112,570. Script: tax on 125,140 is 43,144.50 vs 42,516 correct; 150,000 gives 54,331.50 vs 53,703. Constant +628.50 above 125,140; about +243 at 120k.
- Impact: the Tax page (self-assessment ledger) and take-home are wrong for the top bands, in the opposite direction to C-01, so the product shows different tax for the same salary depending on the page.
- Recommendation: same fix as C-01, one shared band function.
- Effort: M

### [C-03] Gift Aid is double counted in calculateUkTax

- Severity: P0
- Location: packages/finance-engine/src/uk-tax.ts:356-392
- Evidence: `adjustedNetIncome` subtracts gross Gift Aid, then `taxableIncome = adjustedNetIncome` is taxed, and the same gross Gift Aid also extends the bands (`basicBandExtension`). Salary 60,000 with 1,000 net gift: code 10,682, correct 11,182 (understated by 500).
- Impact: wrong tax whenever the Gift Aid field is used. Gift Aid should reduce ANI for the allowance taper and extend bands, not reduce taxable income.
- Recommendation: tax the unreduced income against extended bands; use the reduced figure only for the taper.
- Effort: S

### [C-04] Every new user is seeded with fabricated accounts, duplicated by a race

- Severity: P0
- Location: apps/backend/src/account-intake.service.ts:93-135; apps/web/app/services/backend-client.server.ts:91-100; apps/backend/src/budget.controller.ts:197-216
- Evidence: `getAccounts` saves four demo accounts (Main Checking 2,450.75; Savings 15,800; Cash ISA 42,100.50; Pension 18,500) for any user with no accounts and `hasResetFinancialData` false. The web loader calls `/accounts` and `/portfolio-snapshot` in parallel (`Promise.all`), and `getPortfolioSnapshot` also calls `getAccounts`. Both see zero rows and both insert, so a new user gets eight accounts (read from code, not run). Deleting the last account re-seeds on next load. Budget entries are also seeded (flagged `isDefault`, but the dashboard sums all income and expense rows).
- Impact: invented balances (about 78.9k net worth, possibly 157.7k) persist as the user's real data and flow into dashboard, snapshot, MCP and AI context.
- Recommendation: remove production seeding (gate on an explicit demo flag), or make it an explicit user action. If kept, seed in one place under a unique constraint or transaction.
- Effort: S

### [C-05] Tax records are seeded with the developer's rental and ISA data, recurring forever

- Severity: P0
- Location: apps/backend/src/tax.controller.ts:29-70
- Evidence: empty `tax_records` triggers inserts such as "Poplar Rent (2020/21)" and "Poplar Rent Partial Nov 2020", an annual record dated 2024-10-15 (annual records recur every October, with no end date), and a monthly 45 ISA return from 2024-04-01. `getRecordValueForMonth` (tax-calculator.ts:210-220) repeats annual records each year.
- Impact: new users' tax calculations include 480 of phantom rental income per year and ISA returns, and it all feeds `calculateUKTax` and the dashboard widget.
- Recommendation: delete the seed; migrate existing rows by name/notes if needed.
- Effort: S

### [C-06] Scottish income tax in uk-tax.ts uses 2024/25 bands and mixes bases

- Severity: P1
- Location: packages/finance-engine/src/uk-tax.ts:232-282
- Evidence: starter 2,306, basic 11,685, intermediate 17,101 are the 2024/25 widths. GOV.UK 2026/27: starter to 16,537, basic to 29,526, intermediate to 43,662 (matches `tax-rules.ts:276-288`). The advanced band mixes a gross threshold (75,000) with taxable-income thresholds above it. At 110,000: 35,278 vs 37,514 from the `tax-rules` Scottish table. `taxYear` is ignored.
- Impact: every Scottish user gets the wrong tax; large above 100k, and also for incomes under 50k now that the bands have moved.
- Recommendation: use `UK_SCOTLAND_INCOME_TAX[taxYear]` with `calculateScottishIncomeTaxOnTaxable`.
- Effort: S

### [C-07] Employer NI savings use the old rate for 2025/26

- Severity: P1
- Location: packages/finance-engine/src/uk-tax.ts:164-185
- Evidence: `taxYearOrRate === "2026/27" ? 0.15 : 0.138` and threshold 9,100 for everything else. 2025/26 is 15% and 5,000 (the file's own `UK_EMPLOYER_NI_RATES` says so). Script: 60,000 salary, 3,000 sacrificed gives 414 (2025/26) vs 450.
- Impact: salary sacrifice benefit understated in pension tools; tax-rules and uk-tax disagree.
- Recommendation: read `UK_EMPLOYER_NI_RATES[taxYear]`; also stop accepting a bare percentage as a year.
- Effort: S

### [C-08] Three diverging student loan tables; one is stale, one is shifted by a year

- Severity: P1
- Location: uk-tax.ts:29-44; tax-rules.ts:99-108; debt-payoff.ts:628-642
- Evidence: `evaluateUkStudentLoan` hardcodes Plan 2 27,295 / Plan 1 24,990 / Plan 4 31,395 (2024/25) and looks there first, so `STUDENT_LOAN_THRESHOLDS` is never consulted (script confirms 27,295 for "PLAN_2"). `tax-rules.ts` "2025/26" holds 26,900 / 29,385 / 33,795, which GOV.UK now shows as the current (2026/27) values. `uk-tax.ts` has 26,065 / 28,470 / 32,745 (2025/26, medium-high confidence).
- Impact: Plan 2 repayment in the take-home calculator is overstated by about 77 per year for 2025/26 and the debt page recommendation uses a 2024/25 threshold.
- Recommendation: one `UK_STUDENT_LOANS[taxYear]` table, correct 2025/26 values, used everywhere.
- Effort: S

### [C-09] Tax-year boundary, defaults and fallbacks

- Severity: P1
- Location: tax-rules.ts:955-963 (`getCurrentUKTaxYear`); tax-calculator.ts:182-190 `getTaxYearForDate`, `getMonthsForTaxYear`, 361 fallback; uk-tax.ts:327-340, 346; profile.ts:16
- Evidence: the year flips on 1 April, not 6 April. `getTaxYearForDate("2026-04-03")` returns 2026/27 (script). Records are bucketed by calendar month, so 1-5 April income lands in the new year. `getTaxYearRemainingDays` maps any year other than "2025/26" to 2027. `calculateUkTax` and `DEFAULT_FINANCIAL_BASELINE` default to 2025/26 though today is in 2026/27, and `UkTaxYear` only allows two values (hidden by `as any`). Unknown years fall back to 2024/25 in one place and 2026/27 in another.
- Impact: records and allowances near 5 April go in the wrong year; the remaining-days counter and defaults are wrong; a 2027/28 user silently gets 2026/27 rules.
- Recommendation: one tax-year helper using the 6 April boundary and date strings (no local time); fail loudly for unsupported years; derive defaults from the helper.
- Effort: M

### [C-10] A single bonus record replaces the whole salary

- Severity: P1
- Location: packages/finance-engine/src/tax-calculator.ts:463-465
- Evidence: `effectivePayeSalary = payeIncomeGross > 0 ? payeIncomeGross - payeExpenses : payeSalary`. A lone `paye_bonus` record of 5,000 with a 60,000 salary gives effective salary 5,000 and tax 0 (script).
- Impact: logging any PAYE record without a salary record silences the profile salary.
- Recommendation: add logged income to the profile salary or require an explicit mode.
- Effort: S

### [C-11] Home dashboard "estimated tax due" is a flat 29% of all records

- Severity: P1
- Location: apps/web/app/routes/_index.tsx:138-146 (shown in `TaxWidget.tsx:192`)
- Evidence: sums `r.amount` across all years and ignores `frequency`, then multiplies by 0.29 ("20% tax + 9% Class 4 NI"; Class 4 is 6%). No allowance or bands.
- Impact: a headline tax number on the dashboard that contradicts the Tax page.
- Recommendation: call `calculateUKTax` for the current tax year.
- Effort: S

### [C-12] Debt schedule double counts interest and mislabels principal

- Severity: P1
- Location: packages/finance-engine/src/debt-payoff.ts:281-366, 437-452
- Evidence: interest is added to the balance, then payments are accumulated as `monthTotalPrincipal`, and `totalPaymentsGbp = interest + that`. Script: 1,000 at 24% with 100 minimum: month 1 reports total payments 120 (actual 100) and principal 100 (actual 80). Per-debt `interestChargedGbp` is always 0, and `cumulativeInterest` is always 0.
- Impact: schedule tables and charts overstate payments and principal.
- Recommendation: track interest and principal per debt; derive totals from them.
- Effort: M

### [C-13] Unpayable debts show a 30-year debt-free date; "interest saved vs minimum" is an estimate that is badly off

- Severity: P1
- Location: debt-payoff.ts:259-262, 388-402
- Evidence: 10,000 at 24.9% with minimum 5 returns `monthsToPayoff 360`, "January 2056", remaining balance 15.8m, with no flag. Interest-saved baseline is `balance*rate*(months/2)` using `balance/minimum`; for 5,000 at 20% with 150 minimum and 100 extra it reports 283.62 saved vs 1,226.03 from a real simulation. (`compareAvalancheAndSnowball` uses a real simulation and is fine.)
- Impact: the user sees a false payoff date and understated savings.
- Recommendation: return `payoffAchievable: false` when the balance grows or the cap is hit; use a simulated minimum-only run for the baseline.
- Effort: M

### [C-14] Forecast: baseline double spends debt payments; scenario deficits vanish

- Severity: P1
- Location: packages/finance-engine/src/forecast.ts:73-87, 116, 164-167
- Evidence: baseline pays debt from savings and still invests the full savings (debt 10,000, saving 500/month, 0% growth: net worth moves from -10,000 to +2,000 in a year; correct is -4,000). In the scenario, `availableSavings = max(0, savings - extraCost)` drops any shortfall (cost 800/month on 500 savings gives net worth 0 vs -3,600). `trajectory[10]` is hard-coded (zero when `projectionYears < 10`), and debt carries no interest.
- Impact: the forecaster overstates net worth and understates the cost of life events.
- Recommendation: deduct debt payments from savings in the baseline too; apply deficits to cash, ISA, then debt; index by `years`.
- Effort: M

### [C-15] Overdrawn accounts are treated as positive assets (sign enforcement)

- Severity: P1
- Location: packages/finance-engine/src/portfolio.ts:158-159; packages/banking/src/server/orchestrator.ts:186-200 (called from apps/backend/src/finance.service.ts:316); packages/banking/src/core/sign-enforcement.ts:41
- Evidence: `nominalBalance = Math.abs(raw)`, `normalizeAccountBalance` returns `Math.abs` for non-liability types, `enforceSignConvention` abs for assets. A Monzo current account at -300 is stored as +300 and counted as an asset. A credit card in credit (a positive "owed" value) is counted as debt.
- Impact: net worth is overstated by twice the overdraft for anyone overdrawn.
- Recommendation: do not take `abs` for assets; allow negative asset balances (or move them into debt).
- Effort: S

### [C-16] Net worth history has no carry-forward, duplicates add up, silent defaults

- Severity: P1
- Location: packages/finance-engine/src/portfolio.ts:118-129, 299-355; apps/backend/src/entities/account-detail.entity.ts (no unique key)
- Evidence: a month's total only sums accounts that have a row in that month, so accounts updated in different months cause dips and spikes. Duplicate `(accountId, month, year)` rows are summed. Missing year/month default to 2025/January. Mixed currencies are summed without conversion.
- Impact: the net worth chart is wrong whenever accounts are not all updated every month.
- Recommendation: forward-fill the last known value per account; add a unique constraint; reject bad rows.
- Effort: M

### [C-17] A failed balance call writes a balance of 0

- Severity: P1
- Location: apps/backend/src/providers/monzo.provider.ts:68-86; starling.provider.ts:89-105; finance.service.ts:316-380
- Evidence: balance defaults to 0 on a non-OK response or exception, the account is saved with 0, and a 0 monthly snapshot is written.
- Impact: a transient API error zeroes a real account and the month's history.
- Recommendation: skip the account (keep the last value) and mark the connection as errored.
- Effort: S

### [C-18] deleteAccount ordering, upsert by id and no validation (cross-reference Track D)

- Severity: P1
- Location: finance.service.ts:67-70; tax.controller.ts:774-790; account-intake.service.ts:230-248; no `ValidationPipe` anywhere (`@Body() body: any`)
- Evidence: transactions are deleted by `accountId` before the ownership check, so another user's transactions go even though the account delete then 404s, and the two steps are not in a transaction. `create({...body, userId})` followed by `save` upserts by primary key, so a supplied `id` overwrites someone else's row; `Object.assign(account, body)` on update allows changing `userId`.
- Impact: cross-user data loss or takeover; no sign, range or type validation of amounts, dates or frequencies.
- Recommendation: check ownership first, in a DB transaction; DTOs with `ValidationPipe({whitelist:true})`; strip `id` and `userId`.
- Effort: M

### [C-19] `synchronize: true` on the production database

- Severity: P1
- Location: apps/backend/src/app.module.ts:54, 75
- Evidence: both Postgres configs auto-sync the schema; there are no migrations.
- Impact: an entity edit can drop or alter production columns.
- Recommendation: migrations, and `synchronize` off outside local development.
- Effort: M

### [C-20] The web loader swallows every backend error as an empty workspace

- Severity: P1
- Location: apps/web/app/services/backend-client.server.ts:73-81
- Evidence: non-OK and thrown errors return the fallback (`[]` or `null`).
- Impact: an outage or a 401 renders as "no accounts, net worth 0" rather than an error.
- Recommendation: distinguish failure from empty; surface an error state.
- Effort: M

### [C-21] Invented defaults are shown as the user's data

- Severity: P2
- Location: profile.ts:13-37, 143-242, 291-380; portfolio.ts:279-288; apps/backend/src/user-profile.service.ts:101-115 and `formatProfile`; MortgageContainer.tsx:~111-125; UserProfilePanel.tsx:184-230
- Evidence: missing profile fields default to salary 45,000, savings 5,000, pension 15,000, housing 900, outgoings 1,100, age 32, property value 1.35 x balance. An account with 0% rate is given 19.9% APR and a minimum payment of 2.5% in `toDebtItems`. Pension defaults to 5% sacrificed. The mortgage container uses a 250,000 default BTL value and an LTV of 75 when the value is unknown. `calculateNetTakeHome` ignores the student loan plan and Scotland.
- Impact: plausible but invented figures drive projections.
- Recommendation: treat missing as missing and prompt; allow 0% as a real value.
- Effort: M

### [C-22] Further tax logic gaps

- Severity: P2
- Location: tax-calculator.ts:498-516, 556-563; tax-rules.ts:1121-1123; uk-tax.ts:415-427
- Evidence: no savings starting rate or 0% band: salary 12,570 plus 3,000 interest gives 400 tax (script), real 0. Student loan base after pension is used even when not salary sacrifice. PSA band uses gross income. PAYE tax "already paid" uses the tapered allowance. Dividend tax rates are hardcoded for all years (8.75/33.75/39.35). I could not verify from GOV.UK whether 2026/27 changed them (not stated on the pages I fetched), so re-check.
- Impact: edge errors for low-income savers and mixed incomes.
- Recommendation: model starting rate band; key rates by tax year.
- Effort: M

### [C-23] Section 24 calculator is hardcoded and ignores the allowance taper

- Severity: P2
- Location: packages/finance-engine/src/section24.ts:32-47, 89-92
- Evidence: fixed 12,570 / 50,270 / 125,140 bands, no taper, no tax year; the "old rules" comparison uses 40% if other income is at least 50,270, ignoring the stack.
- Impact: wrong liability above 100k and wrong "penalty" figure.
- Recommendation: reuse the shared band function.
- Effort: S

### [C-24] Mortgage engine edge cases and duplicated formulas

- Severity: P2
- Location: mortgage.ts:77, 98-111, 133-144, 119-124; MortgageTracker.tsx:~69, MortgageContainer.tsx:111,192, OverpayVsSaveCompare.tsx:~67
- Evidence: overpayment larger than the balance is counted in full (300,000 on a 200,000 balance reports 300,000 overpaid and a 148k "net benefit" figure); `interestSaved` covers the whole term while the ISA pot stops at payoff; term 0 becomes 1 month; 0% mortgage returns payment 0 in web components (`interestRate <= 0` guard); ISA monthly rate is effective in one function and nominal in another; month-end dates overflow (`setUTCMonth`). The same payment formula is copied into about 17 web and mobile files.
- Impact: edge-case nonsense and drift between pages.
- Recommendation: cap the final payment, align horizons, one compound-rate convention, route UI through the engine.
- Effort: M

### [C-25] Date handling

- Severity: P2
- Location: debt-payoff.ts:262, 144, 175; mortgage.ts:119-124; tax-calculator.ts:182-190
- Evidence: repeated `setUTCMonth(+1)` from a 29-31 reference date drifts: reference 31 Jan gives first schedule month "2026-03", skipping February (script). `toLocaleDateString` uses the runtime locale and zone; `getFullYear`/`getMonth` (local) are applied to a UTC-parsed `new Date("YYYY-MM-DD")`.
- Impact: off-by-one-month labels; zone-dependent tax-year buckets.
- Recommendation: month arithmetic from year and month integers; keep dates as strings.
- Effort: S

### [C-26] Money is JS floats with mixed rounding

- Severity: P2
- Location: engine-wide; apps/backend/src/entities/transaction.entity.ts and tax-record.entity.ts (decimal columns without transformers); `_index.tsx` uses `Number(x) || 0`
- Evidence: no pence/integer type; some paths round to 2dp, some to whole pounds (`Math.round(pension)`, tax rounded to the pound in `calculateUKEWNITakeHome`), and totals add unrounded values. Transaction and tax record amounts reach clients as decimal strings; budget and accounts convert, transactions do not. Bad input yields NaN rather than an error.
- Impact: rounding drift between pages (1 to 2 pounds), occasional string concatenation risk.
- Recommendation: decide a policy (pence ints at boundaries or round at each money step), add transformers, validate numbers at API edges.
- Effort: L

### [C-27] `any` split (318 by my regex, vs 305 in Phase 1)

- Severity: P2
- Location: see counts
- Evidence: my regex (`: any`, `as any`, `<any>`, tests, stories, generated code excluded) gives 318: web 183 (of which about 13 in `.storybook` and `test`, and 25 in `demoData.ts`), backend 62, mobile 30, ui 16, finance-engine 12, marketing 10, mcp 5, banking 0, common 0. Likely difference from Phase 1 is the regex or the inclusion of marketing/mobile.
  Dangerous ones: backend `req: any` (26, hides `req.user`) and `@Body() body: any` (tax, budget, user-profile, finance controllers: the mass-assignment and validation gap in C-18); `backend-client.server.ts` `fetchJson<any[]>` (9) and `_index.tsx` (20), which let decimal strings and nulls through; `taxYear as any` (`uk-tax.ts:486`, `section24.tool.ts:93`) hiding the two-value `UkTaxYear` type; `persistence.ts` seed `any` (cookie data with no schema); `debt-payoff.ts:659` plan cast; `mcp/transports/http.ts` `req: any`. Benign: `globalThis as any` (profile.ts, 4), index signatures in portfolio.ts.
- Impact: type checks do not protect money paths.
- Recommendation: DTO classes for the backend, typed API client, widen `UkTaxYear` to `string`.
- Effort: L

### [C-28] Bank sync dedupe and concurrency

- Severity: P2
- Location: finance.service.ts:318-409; mortgage and sync entities lack unique keys
- Evidence: a transaction is skipped when amount, description and timestamp match, so two identical purchases in the same second collapse into one; one query per transaction; only the latest 30 transactions are fetched; two concurrent syncs can insert duplicate accounts (find-then-create with no unique constraint on `(connectionId, externalAccountId)`).
- Impact: missing or duplicated transactions and accounts.
- Recommendation: use provider transaction ids with a unique index; upsert.
- Effort: M

### [C-29] Smaller correctness issues

- Severity: P3
- Location: tax-rules.ts:410 (2023/24 main NI rate 0.08, real blended about 11.5%); health-score.ts:55,148,163,175 (no-locale `toLocaleString`, raw `£${totalDebt}`) and 172-188 ("optimized" copy above 125,140); health-score high-interest threshold 10% in docs vs 6.5% in `evaluateFinancialStage`; persistence.ts:150 (`decodeURIComponent` can throw on a malformed cookie, no `Secure` flag); plaid.ts bucket matching (`TAX` matches taxi, `GAS` matches Vegas) in an adapter that is only a mock; `evaluateUkStudentLoan` presents a heuristic as "gift to HM Treasury" advice.
- Impact: low.
- Recommendation: tidy when touching these files.
- Effort: S

## Not covered or unverified

- No runtime pass of the web app; web numbers were read from code only.
- Irish tax tables (tax-rules.ts, IRELAND_*) were not checked against Revenue.
- 2025/26 values rest on my knowledge, not on a fetched page (see header).
- I did not review `packages/mcp` beyond its calls into the engine, mobile screens, or the Open Banking provider.

## Quick wins

1. Remove production seeding of accounts and tax records (C-04, C-05).
2. One band function for EWNI and Scottish tax, with test vectors (C-01, C-02, C-03, C-06).
3. Read employer NI and student loan from `tax-rules.ts` tables (C-07, C-08).
4. Do not take `abs` of asset balances (C-15) and skip zero-on-failure balances (C-17).
5. Check ownership before deleting transactions; add `ValidationPipe` with `whitelist: true` (C-18).
6. Replace the dashboard 29% estimate with the engine call (C-11).
7. Flag unpayable debts (C-13) and fix the schedule totals (C-12).
