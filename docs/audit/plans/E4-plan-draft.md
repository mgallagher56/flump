# E4 draft plan (planning workflow output)

Status: **draft, not reviewed, nothing implemented.** Produced by a read-only planner and fact-checked by a second agent; both can be wrong. Facts cite file:line in the code at the time of the run.

**Epic:** E4. Tax and money correctness (C-01, C-02, C-03, C-06, C-07, C-08, C-10, C-11, C-13, C-14, C-15, F-02, F-06, B-07)

**Goal:** Every UK income tax, NI, student loan, Scottish and dividend figure the product shows comes from one year-keyed rules API in packages/finance-engine. That API is checked against test vectors that are written first, carry a source, and are signed off by someone with UK tax knowledge. Debt, forecast and balance arithmetic can no longer produce impossible results (a false payoff date, debt payments spent twice, overdrafts counted as assets). The hand-written copies in apps/web, packages/ui, packages/mcp and apps/mobile-companion are replaced by engine calls, and a CI guard stops new copies.

**Classification:** architectural

## Design

SPEC (records decisions; nothing is implemented)

1. Canonical tax-year API (new module packages/finance-engine/src/uk-tax-year.ts, exported from src/index.ts). The data stays in tax-rules.ts (tables for EWNI, Scotland, NI, employer NI and student loans already exist at tax-rules.ts:91, 201, 308, 352 and 497). The new module adds the missing per-year data and is the only way calculators read rules:
   - `SUPPORTED_UK_TAX_YEARS` (readonly tuple set by D1); `type UkTaxYear = typeof SUPPORTED_UK_TAX_YEARS[number]` replaces types.ts:15.
   - `class UnsupportedUkTaxYearError extends Error { year: string }`.
   - `getUkTaxYearForDate(isoDate: string): string`: string-based, no local time, year starts 6 April (D8).
   - `getCurrentUkTaxYear(now: Date = new Date()): UkTaxYear`: throws if the year is not supported, rather than silently falling back.
   - `resolveUkTaxYear(year?: string, now?: Date): UkTaxYear`: undefined means the current year; unknown years throw.
   - `interface UkTaxYearRules { year; ewni: UKEWNIIncomeTaxYear; scotland: UKScotlandIncomeTaxYear; ni: UKNationalInsuranceYear; employerNi: UKEmployerNIRate; studentLoans: UKStudentLoanYear; savings: { psaBasic; psaHigher; psaAdditional }; dividends: { allowance; basicRate; higherRate; additionalRate }; giftAidGrossUp: 1.25; sources: string[]; verified: boolean }`.
   - `getUkTaxYearRules(year: UkTaxYear): UkTaxYearRules`.
   - Pure calculators that take `rules`, each in its own function:
     - `calculatePersonalAllowanceForYear(ani, rules)`: floors the taper (£1 per £2).
     - `calculateIncomeTaxOnTaxable(taxable, rules, region, opts?: { bandExtension?: number }): { total: number; bands: { name: string; rate: number; taxable: number; tax: number }[] }`. EWNI bands run on taxable income: basic up to basicRateBandWidth + ext, higher up to additionalRateThreshold + ext (125,140 taxable, not 112,570), additional above. Scotland walks rules.scotland.bands, with the extension applied per D9.
     - `calculateEmployeeNi(pay, rules)`, `calculateClass4Ni(profit, rules)`, `calculateEmployerNiSaving(gross, sacrifice, rules)`, `calculateStudentLoanRepayment(pay, plan, rules)`.
   - The existing functions (calculateUkTax, calculateUKEWNITakeHome, calculateUKTax, evaluateUkStudentLoan, calculateEmployerNISavings, calculateEwniIncomeTax, calculateScottishIncomeTax) keep their signatures and become thin wrappers, so the roughly 70 importing files keep compiling. Removing the wrappers and renaming the calculateUKTax/calculateUkTax pair is out of scope.

2. Money and rounding (D5, recommended option A). The engine keeps pounds as JS numbers. One helper, `roundPence(x) = Math.round((x + Number.EPSILON) * 100) / 100`, is applied only at public result boundaries. There is no whole-pound rounding of tax or NI inside calculators; calculateUKEWNITakeHome currently does this at tax-rules.ts:1095 and 1115. Inputs are parsed once with `toMoney(value: number | string | null): number`. Vectors compare to the penny (`toBeCloseTo(x, 2)`).

3. Tax-year selection by consumers. Engine calls take an explicit `taxYear` where the user picked one (the Tax page), otherwise `resolveUkTaxYear()`. Apps never hardcode a year or a threshold. MCP guardrails and UI thresholds read `getUkTaxYearRules(getCurrentUkTaxYear())`. Region comes from FinancialBaseline.ukRegion (types.ts:29), defaulting to ENGLAND_NI_WALES.

4. Test vectors before fixes. Add `packages/finance-engine/src/test-vectors/uk-tax.vectors.ts`, an array of `{ id; taxYear; region; fn; input; expected; source: string /* GOV.UK URL */; derivation: string; confidence: 'high'|'medium'; signedOffBy: string | null }`. Each fix task first adds its vectors and a failing test, then fixes the code. Authoritative sources to cite per vector:
   - https://www.gov.uk/income-tax-rates (current EWNI bands)
   - https://www.gov.uk/government/publications/rates-and-allowances-income-tax (past years)
   - https://www.gov.uk/scottish-income-tax and https://www.gov.scot/ (Scottish budget rate and band publications)
   - https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026 and ...-2026-to-2027 (employee and employer NI, student-loan and postgraduate thresholds)
   - https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions (Class 1 and Class 4 history, including the 2023/24 mid-year changes)
   - https://www.gov.uk/repaying-your-student-loan/what-you-pay
   - https://www.gov.uk/tax-on-dividends
   - https://www.gov.uk/donating-to-charity/gift-aid and https://www.gov.uk/guidance/adjusted-net-income (Gift Aid band extension and the taper)
   Confidence on figures in the facts list: 2026/27 EWNI, Scotland and NI are high (the audit fetched GOV.UK on 2026-11-11, C-correctness.md:5). 2025/26 student loans at 26,065 / 28,470 / 32,745 are medium-high. The 2023/24 NI rate correction is high. The 2026/27 dividend rates of 10.75% / 35.75% are medium. Every figure is flagged for human sign-off; none is final until `signedOffBy` is set.
   Property checks are a deterministic sweep (gross 0 to 300,000 in £250 steps, per supported year and region), with no new dependency. They check: net is monotonic non-decreasing in gross; tax and NI are never negative; net + tax + NI + student loan + employee pension = gross. A fake-timer test checks that getCurrentUkTaxYear() on 5 and 6 April of each supported year resolves to a year with every table present.

5. Independent small fixes (no canonical API needed, only the per-year tables that already exist): C-02, C-01+C-03 (after C-02's band function), C-06, C-07, C-08, C-13, C-14 and the B-07 formula swaps (mortgage payment, future value). These need the API or a decision first: C-10 (D3), C-11 (D4 and C-02), C-15/F-02 (D2), the F-06 per-year table tests (D1), tax-trap semantics (D7), the mobile duplicates (D6), and removing the MCP and UI threshold copies (the API).

6. Debt and forecast semantics (from the acceptance criteria, no decision needed).
   - DebtPayoffResult gains `payoffAchievable: boolean` and `unachievableReason?: 'BALANCE_GROWING' | 'MAX_MONTHS_REACHED'`. When it is false, debtFreeDate is null rather than a date. interestSavedVsMinimumGbp comes from an internal minimum-only simulation. This must not call calculateDebtSchedule recursively with a baseline: use an internal simulate() without the baseline step.
   - The forecast baseline takes debt payments out of savings before investing.
   - Scenario shortfalls draw down cash, then ISA, then add to debt.
   - The ten-year figure reads trajectory[Math.min(10, years)].
   - Debt interest in the forecast stays out of scope (an optional input defaulting to 0 can be added later).

7. Sign convention (D2, recommended option a). Asset balances keep their provider sign, so negative is allowed. Liabilities are stored as -|owed|, and a liability in credit (a positive provider value where the provider's convention says it is a credit) becomes a positive asset-side value. nominalBalance is kept as a magnitude for display only, and netWorthBalance is signed. Balances already stored with abs are corrected on the next sync for synced accounts. Manual accounts were never abs'd at write time, so need no migration (verify in the task).

8. Removing duplicates. Web mortgage and future-value copies call the engine. The overpayment comparison moves into mortgage.ts (`calculateMortgageOverpayment`). TaxTrapEscapeBanner, PensionForecasterCard and MCP guardrails derive thresholds from getUkTaxYearRules. Mobile follows D6. Finally, `scripts/check-no-local-finance-math.sh` (modelled on scripts/check-no-mock-auth.sh) fails CI when it finds `(1 + ...) **` amortisation or future-value patterns or the literals 12570, 50270, 125140, 37700 in apps/ or packages/ui and packages/mcp. packages/finance-engine and tests are allow-listed.

AGENTS.md laws touched:
- Law 4/5 (four-gate CI pre-flight) applies to every task.
- Law 2 (tabular-nums and en-GB formatting) applies to any task that changes a rendered figure: C-11, the C-13 'not achievable' copy, the B-07 web swaps. These tasks only change the source of the number, not its formatting; verify no regression.
- Law 1 (colocation). TaxWidget.tsx, DebtSummaryCards.tsx, MortgageTracker.tsx and the other web components touched are existing flat files. E4 edits logic only, creates no new component and does not restructure; moving them into PascalCase directories belongs to the design-system epic. packages/ui TaxTrapEscapeBanner is already colocated, so its colocated test must be updated.
- Laws 3 (KpiStrip, SimulatorSplitLayout) and 6 are not touched by the engine work. Law 6 applies only to how implementers are spawned.

## Decisions needed from the product owner

1. **D1. Which UK tax years must be supported and verified, and what happens for any other year (for example 2027/28 before tables are added)?**
   - (a) Only 2025/26 and 2026/27 verified; older tables deleted; unsupported years throw
   - (b) 2023/24 to 2026/27 verified (matches the 4-year amendment and claim window used for self-assessment history on the Tax page); 2020/21 to 2022/23 kept but marked verified:false and labelled 'unverified' in the UI; unknown years throw UnsupportedUkTaxYearError
   - (c) Verify every year from 2020/21 onwards, including 2022/23 mid-year NI blends
   - Recommendation: (b). TaxContainer computes every available year (TaxContainer.tsx:244-249), so dropping years would break history. Four years covers what users can still amend. Throwing on unknown years replaces the current silent fallbacks (tax-rules.ts:557, 1062).
   - Blocks: T2 Canonical tax-year API, T3b Correct remaining table data (NI 2023/24, dividends), T14 F-06 table-driven and property tests

2. **D2. Sign rule for bank balances (C-15, F-02): how is an overdrawn current account and a credit card in credit represented?**
   - (a) Assets keep provider sign (overdrawn current = -1500, counted negative in assets); liabilities stored as -owed; a liability in credit becomes a positive value
   - (b) Overdrawn asset accounts are reclassified into liabilities totals (shown under debt) while the account record keeps its type
   - (c) Keep sign on the record (a) and additionally surface overdrafts as a separate liability line in PortfolioSnapshot totals
   - Recommendation: (a). It is the smallest change, matches the F-02 acceptance (test becomes -1500), and gives correct net worth. (c) can follow as a UX change.
   - Blocks: T13 Sign convention for balances (C-15, F-02)

3. **D3. How should logged PAYE records combine with the profile salary (C-10)?**
   - (a) paye_salary records replace the profile salary for that year; paye_bonus and paye_benefit records add on top of whichever salary applies
   - (b) All PAYE records add to the profile salary
   - (c) An explicit per-year mode: 'use profile salary' or 'use logged payslips only'
   - Recommendation: (a). It fixes the lone-bonus case without double counting users who log their full salary. (c) adds UI work.
   - Blocks: T9 Lone bonus no longer replaces salary (C-10)

4. **D4. What figure should the dashboard 'Est. Tax Due (taxYear)' show (C-11)?**
   - (a) Total income tax + NI liability for the current tax year from calculateUKTax (totalTaxDue)
   - (b) Additional tax to pay beyond PAYE (netAdditionalTaxToPay), i.e. the self-assessment balance
   - (c) Either (a) or (b), but show an empty state instead of £0 when there is no salary and no records
   - Recommendation: (b) plus the empty state from (c). The widget sits beside 'Net Profit' and the Tax page is a self-assessment ledger, so the self-assessment balance is the meaningful 'due' number. The label wording needs product sign-off.
   - Blocks: T10 Dashboard estimated tax due (C-11)

5. **D5. Money representation and rounding policy**
   - (a) Keep pounds as floats; one roundPence helper at public result boundaries; no whole-pound rounding inside calculators; inputs parsed once via toMoney. Cost: S, about 1 day spread across the tax tasks
   - (b) Integer pence inside the tax module only, converted at the API boundary. Cost: M, about 3 to 4 days; touches uk-tax.ts, tax-rules.ts calculators, tax-calculator.ts and all their tests
   - (c) Integer pence everywhere (engine, about 160 Math.round sites in 10 modules, about 70 importing files, API contracts and DB mapping from decimal(12,2)). Cost: L, roughly 2 to 3 weeks plus API migration risk
   - Recommendation: (a). These are annual estimates: float error is far below a penny at these magnitudes, and the database already stores exact decimal(12,2). Revisit (b) only if the product starts producing filing-grade figures.
   - Blocks: T2 Canonical tax-year API

6. **D6. Mobile companion duplicates (B-07): fix now or park with E12?**
   - (a) Replace ForecastScreen, ProfileScreen and MortgageScreen maths with engine calls now (the package already depends on @flump/finance-engine)
   - (b) Park: put mobile on the CI guard allow-list and add a banner saying figures may be out of date until E12 decides
   - (c) Remove the calculator sections from those mobile screens until E12
   - Recommendation: (a). It is a small change, and the engine already has calculateIrishTakeHome and the mortgage functions. The mobile package has no test runner, though, so verification is limited to check-types plus engine tests.
   - Blocks: T16 Mobile duplicates (B-07)

7. **D7. Tax-trap marginal rate semantics (F-06, 60% vs 62%)**
   - (a) marginalRatePct = income tax only (60 EWNI, 67.5 Scotland); effectiveMarginalRatePct includes employee NI (62, 69.5); calculateTaxTrapRelief stops overwriting; both savings figures labelled
   - (b) Show 62% (with NI) everywhere for employees
   - (c) Show 60% everywhere
   - Recommendation: (a). Two clearly named fields, with no override at uk-tax.ts:152-156.
   - Blocks: T14 F-06 table-driven and property tests

8. **D8. Fold the 6 April boundary fix (C-09, downgraded to P2) into the new resolver?**
   - (a) Yes: getUkTaxYearForDate uses the 6 April boundary and date strings, and old helpers delegate to it
   - (b) No: the resolver keeps the 1 April behaviour and C-09 is fixed separately
   - Recommendation: (a). The resolver is being written anyway, and the F-06 fake-timer test around 5/6 April only makes sense with the correct boundary. Month-bucketing of records (tax-calculator.ts:174-188) stays out of scope.
   - Blocks: T2 Canonical tax-year API

9. **D9. Does a Scottish taxpayer's Gift Aid band extension apply to the Scottish bands, and how? This is a tax rule, not policy; it needs the UK tax reviewer's ruling.**
   - (a) Extend the Scottish basic and higher band limits by gross Gift Aid (shifting all bands above starter)
   - (b) Ignore Gift Aid band extension for Scotland and only use it for the allowance taper, with a disclaimer
   - Recommendation: Ask the tax reviewer. Until then, (b) with a disclaimer avoids asserting a rule we have not verified.
   - Blocks: T6 Scottish tax from the per-year table (C-06)

## Tasks

### 1. T1 Test-vector catalogue and harness (written before any fix) (effort S)

- Files: `packages/finance-engine/src/test-vectors/uk-tax.vectors.ts (new)`, `packages/finance-engine/src/test-vectors/uk-tax.vectors.test.ts (new)`
- Interfaces: export interface UkTaxVector { id: string; taxYear: string; region: 'ENGLAND_NI_WALES' | 'SCOTLAND'; kind: 'incomeTax' | 'employeeNi' | 'employerNiSaving' | 'studentLoan' | 'giftAid' | 'class4' | 'dividends'; input: Record<string, number | string>; expected: number; source: string; derivation: string; confidence: 'high' | 'medium'; signedOffBy: string | null }; export const UK_TAX_VECTORS: readonly UkTaxVector[]
- Tests:
  - 'every vector cites a gov.uk source': each source matches /^https:\/\/www\.gov\.(uk|scot)\//
  - 'every vector has a derivation and confidence': non-empty derivation string
  - 'vector ids are unique'
  - Seed vectors (data only, not yet asserted against code): EWNI 2025/26 and 2026/27 at 100000 gives 27432, 110000 gives 33432, 125140 gives 42516, 150000 gives 53703, 60000 gives 11432; Gift Aid 60000 with 1000 net gives 11182; employee NI 60000 gives 3210.60; employer NI saving 2025/26 (60000, 3000) gives 450; Plan 2 35000 gives 587.70 (2025/26) and 505.35 (2026/27); Scotland 2026/27 50000 gives 8982.05. All signedOffBy null

### 2. T2 Canonical tax-year API (uk-tax-year.ts) (effort M, needs decision)

- Files: `packages/finance-engine/src/uk-tax-year.ts (new)`, `packages/finance-engine/src/uk-tax-year.test.ts (new)`, `packages/finance-engine/src/types.ts:15 (UkTaxYear derived from SUPPORTED_UK_TAX_YEARS)`, `packages/finance-engine/src/tax-rules.ts:955-963 (getCurrentUKTaxYear delegates)`, `packages/finance-engine/src/tax-calculator.ts:147-155 (getTaxYearForDate delegates)`, `packages/finance-engine/src/index.ts`
- Interfaces: SUPPORTED_UK_TAX_YEARS; class UnsupportedUkTaxYearError; getUkTaxYearForDate(isoDate: string): string; getCurrentUkTaxYear(now?: Date): UkTaxYear; resolveUkTaxYear(year?: string, now?: Date): UkTaxYear; getUkTaxYearRules(year: UkTaxYear): UkTaxYearRules (with dividends and savings per year moved out of tax-calculator.ts:500-514, 659-661); calculatePersonalAllowanceForYear; calculateIncomeTaxOnTaxable(taxable, rules, region, { bandExtension }); calculateEmployeeNi; calculateClass4Ni; calculateEmployerNiSaving; calculateStudentLoanRepayment; roundPence; toMoney
- Depends on: T1
- Tests:
  - 'getUkTaxYearForDate: 2026-04-05 gives 2025/26 and 2026-04-06 gives 2026/27'
  - 'resolveUkTaxYear throws UnsupportedUkTaxYearError for 2027/28 and 1999/00'
  - 'every supported year has ewni, scotland, ni, employerNi, studentLoans, dividends tables' (loops SUPPORTED_UK_TAX_YEARS)
  - 'getCurrentUkTaxYear with fake timers at 5 and 6 April of each supported year resolves to a supported year' (vi.useFakeTimers)
  - 'calculateIncomeTaxOnTaxable EWNI matches vectors at taxable 87430 / 102430 / 125140 / 150000' gives 27432 / 33432 / 42516 / 53703
  - 'calculateIncomeTaxOnTaxable returns per-band breakdown summing to total'
  - 'roundPence(0.1+0.2) === 0.3'; 'toMoney("1500.50") === 1500.5'; 'toMoney(null) === 0'

### 3. T3a Correct 2025/26 student loan thresholds in UK_STUDENT_LOANS (effort S)

- Files: `packages/finance-engine/src/tax-rules.ts:518-527`, `packages/finance-engine/src/tax-rules.test.ts`
- Interfaces: Data only: 2025/26 plan1 26065, plan2 28470, plan4 32745 (medium-high confidence, needs sign-off against gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026)
- Depends on: T1
- Tests:
  - 'UK_STUDENT_LOANS 2025/26 thresholds match GOV.UK': plan2.threshold === 28470, plan1 === 26065, plan4 === 32745
  - 'UK_STUDENT_LOANS 2026/27 thresholds match GOV.UK': plan2 === 29385, plan1 === 26900, plan4 === 33795

### 4. T3b Correct remaining table data (NI 2023/24, dividend rates by year) (effort S, needs decision)

- Files: `packages/finance-engine/src/tax-rules.ts:404-420`, `packages/finance-engine/src/uk-tax-year.ts (dividends table)`, `packages/finance-engine/src/tax-rules.test.ts`
- Interfaces: Data only; 2023/24 class1 mainRate replaced by the documented annual approach (blend or split, reviewer to choose); dividends 2026/27 rates per sign-off
- Depends on: T2
- Tests:
  - 'UK_NATIONAL_INSURANCE 2023/24 class1 mainRate is not 0.08'
  - 'dividend rates 2025/26 are 0.0875/0.3375/0.3935' and '2026/27 rates match signed-off vector'

### 5. T4 C-02: one EWNI band function; 45% starts at taxable 125,140 in tax-rules and tax-calculator (effort S)

- Files: `packages/finance-engine/src/tax-rules.ts:995-1016`, `packages/finance-engine/src/tax-calculator.ts:634-687`, `packages/finance-engine/src/tax-rules.test.ts:56-74`, `packages/finance-engine/src/tax-calculator.test.ts (new)`
- Interfaces: calculateUKEWNIIncomeTaxOnTaxable(taxable, year) keeps its signature; higherBandWidth = additionalRateThreshold - basicRateBandWidth. calculateIncomeTaxForTaxable and the dividend stack use the same threshold (taxable 125,140 from UK_EWNI_INCOME_TAX[taxYear])
- Depends on: T1
- Tests:
  - 'calculateUKEWNIIncomeTaxOnTaxable(125140, 2025/26) === 42516' (was 43144.50)
  - 'calculateUKEWNIIncomeTaxOnTaxable(150000, 2026/27) === 53703'
  - 'calculateUKTax(2026/27, [], 150000, 100).totalIncomeTaxDue === 53703'
  - 'calculateUKTax dividend in additional band: 140000 salary + 5000 dividends taxed at additional dividend rate on (5000-500)'

### 6. T5 C-01 and C-03: calculateUkTax taxes taxable income on extended bands; Gift Aid only reduces ANI for the taper (effort M)

- Files: `packages/finance-engine/src/uk-tax.ts:190-227, 345-470`, `packages/finance-engine/src/uk-tax.test.ts`
- Interfaces: calculateEwniIncomeTax(taxableIncome, personalAllowance, basicBandExtension, taxYear = resolveUkTaxYear()) delegates to the shared band function on (income - PA); calculateUkTax: ani = gross - pension - grossGiftAid (taper only); taxable = max(0, gross - pension - PA); bands extended by grossGiftAid; default taxYear = resolveUkTaxYear() (replaces '2025/26' at 346)
- Depends on: T4
- Tests:
  - 'calculateUkTax 110000 EWNI 2025/26 incomeTaxGbp === 33432' (was 31432)
  - 'calculateUkTax 125140 gives 42516' and '150000 gives 53703'
  - 'calculateUkTax 60000 with giftAidContributionsGbp 1000 gives incomeTaxGbp 11182' (was 10682)
  - 'Gift Aid restores allowance: 105000 with 4000 net Gift Aid gives ANI 100000 and effective allowance 12570'
  - 'calculateUkTax default taxYear equals getCurrentUkTaxYear()' (fake timers)

### 7. T6 C-06: Scottish tax from the per-year table (effort S, needs decision)

- Files: `packages/finance-engine/src/uk-tax.ts:232-282, 389-392`, `packages/finance-engine/src/uk-tax.test.ts:99-105`
- Interfaces: calculateScottishIncomeTax(taxableIncome, personalAllowance, taxYear = resolveUkTaxYear()) is calculateScottishIncomeTaxOnTaxable(taxableIncome - PA, UK_SCOTLAND_INCOME_TAX[taxYear]); calculateUkTax passes taxYear; Gift Aid handling per D9
- Depends on: T5
- Tests:
  - 'Scotland 2026/27 gross 50000 incomeTax === 8982.05' (replaces the '> 0' assertion at uk-tax.test.ts:101)
  - 'Scotland 2025/26 110000 matches table function' (exact value from the signed-off vector)
  - 'Scotland ignores no taxYear: 2025/26 and 2026/27 at 30000 differ'

### 8. T7 C-07: employer NI savings read UK_EMPLOYER_NI_RATES[taxYear] (effort S)

- Files: `packages/finance-engine/src/uk-tax.ts:160-185`, `packages/finance-engine/src/uk-tax.test.ts:75-79`, `apps/web/app/components/pension/PensionForecasterCard.tsx:316`, `apps/web/app/components/pension/PensionQuickStartWizard.tsx:116`
- Interfaces: calculateEmployerNISavings(grossSalary: number, sacrificeAmount: number, taxYear: string = getCurrentUKTaxYear()): number. The number-as-rate overload is removed (check-types will flag any numeric caller); unknown years throw
- Depends on: T1
- Tests:
  - '2025/26: 60000 salary, 3000 sacrifice gives 450' (was 414)
  - '2024/25: 60000, 3000 gives 414 (13.8%, threshold 9100)'
  - 'sacrifice capped at earnings above secondary threshold: 6000 salary, 3000 sacrifice, 2026/27 gives 150'
  - 'throws UnsupportedUkTaxYearError for 2030/31'

### 9. T8 C-08: one student loan table used everywhere (effort S)

- Files: `packages/finance-engine/src/uk-tax.ts:29-44, 309-322`, `packages/finance-engine/src/debt-payoff.ts:19, 623-669`, `packages/finance-engine/src/debt-payoff.test.ts:167-172`, `packages/mcp/src/resources/baseline.resource.ts:94-100`
- Interfaces: STUDENT_LOAN_THRESHOLDS kept as a deprecated alias built from UK_STUDENT_LOANS[getCurrentUKTaxYear()], or removed; calculateStudentLoanDeduction(grossPay, plan, taxYear = resolveUkTaxYear()); evaluateUkStudentLoan(plan, annualSalary, currentBalance, taxYear = resolveUkTaxYear()); write-off years live in a separate non-year constant STUDENT_LOAN_WRITE_OFF_YEARS
- Depends on: T3a
- Tests:
  - 'evaluateUkStudentLoan(plan2, 35000, 40000, 2025/26).threshold === 28470 and annualRepayment === 587.70'
  - 'evaluateUkStudentLoan(PLAN_2, ...) and (plan2, ...) agree'
  - 'calculateStudentLoanDeduction(35000, PLAN_2, 2026/27) === 505.35'
  - 'grep-style test: debt-payoff.ts contains no numeric threshold literals' (optional)

### 10. T9 C-10: a lone bonus record no longer replaces the salary (effort S, needs decision)

- Files: `packages/finance-engine/src/tax-calculator.ts:437-465`, `packages/finance-engine/src/tax-calculator.test.ts`
- Interfaces: Per D3(a): payeSalaryLogged = sum(paye_salary); payeExtras = sum(paye_bonus + paye_benefit); effectivePayeSalary = (payeSalaryLogged > 0 ? payeSalaryLogged : payeSalary) + payeExtras - payeExpenses
- Depends on: T4
- Tests:
  - 'lone paye_bonus 5000 with profile salary 60000 gives effectivePayeSalary 65000'
  - 'paye_salary record 58000 replaces profile 60000 and gives effectivePayeSalary 58000'
  - 'paye_pension 3000 reduces effective salary'

### 11. T10 C-11: dashboard estimated tax due from the engine (effort S, needs decision)

- Files: `packages/finance-engine/src/tax-calculator.ts (add estimateTaxDueForYear)`, `packages/finance-engine/src/tax-calculator.test.ts`, `apps/web/app/routes/_index.tsx:137-146, 236`, `apps/web/app/routes/_index.test.tsx`, `apps/web/app/components/dashboard/HomeDashboard.test.tsx:119 (fixture)`
- Interfaces: export function estimateTaxDueForYear(records: TaxRecord[], payeSalary: number, propertyOwnershipShare: number, taxYear = getCurrentUKTaxYear()): { taxYear: string; totalIncome: number; totalExpenses: number; netProfit: number; estimatedTaxDue: number | null; recordsCount: number }. estimatedTaxDue per D4; null for the empty state
- Depends on: T4, T9
- Tests:
  - 'only records active in the tax year count': an annual record from 2019 outside the year's months is excluded
  - 'self-employed profit 30000, no salary: estimatedTaxDue equals calculateUKTax result (incomeTax 3486 + Class 4 at 6%)' (not 0.29 x 30000 = 8700)
  - '_index loader passes estimateTaxDueForYear output into taxData' (mock backend data)
  - 'no salary and no records gives estimatedTaxDue null'

### 12. T11 C-13: payoffAchievable flag and simulated minimum-only baseline (engine) (effort M)

- Files: `packages/finance-engine/src/debt-payoff.ts:197-428`, `packages/finance-engine/src/types.ts:258 (DebtPayoffResult)`, `packages/finance-engine/src/debt-payoff.test.ts`
- Interfaces: DebtPayoffResult gains payoffAchievable: boolean; unachievableReason?: 'BALANCE_GROWING' | 'MAX_MONTHS_REACHED'; debtFreeDate: string | null. Internal simulateSchedule(debts, extra, strategy, opts) is shared by the main run and the baseline (no recursion into baseline)
- Tests:
  - '10000 at 24.9% with minimum 5 gives payoffAchievable false, reason BALANCE_GROWING, debtFreeDate null'
  - '5000 at 20%, min 150, extra 100: interestSavedVsMinimumGbp equals calculateMinimumOnly(...).totalInterest minus this run's interest, to 2 dp' (about 1226.03 per audit, recompute)
  - 'cap reached with shrinking balance gives MAX_MONTHS_REACHED'
  - 'payable debt still gives payoffAchievable true and the existing schedule'

### 13. T11b C-13 consumers: show 'not payable at current payments' instead of a date (effort S)

- Files: `apps/web/app/components/debt/DebtSummaryCards.tsx`, `apps/web/app/components/debt/PayoffStrategySwitcher.tsx`, `apps/web/app/components/dashboard/widgets/DebtWidget.tsx`, `packages/ui/src/calculators/DebtSnowballCalculator/DebtSnowballCalculator.tsx (+ its .test.tsx and .stories.tsx)`, `packages/mcp/src/tools/debt-simulator.tool.ts`
- Interfaces: Consumers branch on payoffAchievable; MCP tool returns payoffAchievable in its JSON
- Depends on: T11
- Tests:
  - 'DebtSnowballCalculator renders not-payable message when payoffAchievable false' (colocated test; story variant in Light and Dark with zero a11y violations)
  - 'debt-simulator tool output includes payoffAchievable false for unpayable input'

### 14. T12 C-14: forecast stops double-spending debt payments and keeps scenario deficits (effort M)

- Files: `packages/finance-engine/src/forecast.ts:71-176`, `packages/finance-engine/src/forecast.test.ts`
- Interfaces: Baseline: debtPayment = min(debt, savings*12); invested = savings*12 - debtPayment. Scenario: net = savings*12 - extraCost*12; a negative net draws cash, then ISA, then adds to debt. tenYear values = trajectory[Math.min(10, years)]
- Tests:
  - 'debt 10000, saving 500/month, 0% growth: baseline year-1 net worth === -4000' (was +2000)
  - 'cost 800/month on 500 savings, 0% growth, no assets: scenario year-1 net worth === -3600' (was 0)
  - 'projectionYears 5 gives tenYear values equal to trajectory[5]'
  - 'existing 30-year test replaced with exact value computed by hand at stated rates'

### 15. T13 C-15 and F-02: sign convention for balances (effort M, needs decision)

- Files: `packages/banking/src/server/orchestrator.ts:181-200`, `packages/banking/src/server/orchestrator.test.ts:21-31`, `packages/banking/src/core/sign-enforcement.ts:31-55`, `packages/banking/src/core/sign-enforcement.test.ts`, `packages/finance-engine/src/portfolio.ts:57, 158-159`, `packages/finance-engine/src/portfolio.test.ts:104-117`, `apps/backend/src/finance.service.ts:387 (+ finance controller/service spec)`
- Interfaces: normalizeAccountBalance(type, raw): assets return raw (sign kept); liabilities return -Math.abs(raw) unless the provider indicates credit (per D2). enforceSignConvention: assets keep netWorthImpactGbp sign. Portfolio: netWorthBalance = isLiability ? -abs : raw; nominalBalance = abs for display
- Tests:
  - 'normalizeAccountBalance(Current, -1500) === -1500' (replaces the pinned 1500)
  - 'enforceSignConvention keeps an overdrawn current account negative'
  - 'PortfolioSnapshot: current account -300 lowers total assets by 300 and net worth by 300'
  - 'sync of an overdrawn provider account stores a negative balance' (backend spec with a fake provider returning -1500)

### 16. T14 F-06: exact-value, table-driven and property tests (effort M, needs decision)

- Files: `packages/finance-engine/src/tax-rules.test.ts:44-105`, `packages/finance-engine/src/uk-tax.test.ts:43-79`, `packages/finance-engine/src/mortgage.test.ts:13-18, 52-72`, `packages/finance-engine/src/uk-tax-year.property.test.ts (new)`, `packages/finance-engine/src/uk-tax.ts:144-158 (per D7)`
- Interfaces: No new runtime API. Remove the calculateTaxTrapRelief override per D7. buildLegacyUKConfig('1999/00') throws instead of falling back (tax-rules.ts:557-558)
- Depends on: T2, T5, T6, T7, T8
- Tests:
  - 'per supported year: personal allowance, basic band, additional threshold, NI PT/UEL/rates, student loan thresholds equal signed-off vectors' (it.each over SUPPORTED_UK_TAX_YEARS)
  - 'sweep 0..300000 step 250 per year and region: net non-decreasing; tax >= 0; net + tax + NI + SL + pension === gross (to 0.01)'
  - 'mortgage 250000 at 4.5% over 25y gives monthly payment 1389.58' (exact, replaces the 1380-1400 range; recompute and cite the formula)
  - 'tax trap 110000: marginalRatePct 60, effectiveMarginalRatePct 62, estimatedTaxSavedByEscapingGbp 6000, estimatedTaxSaved 6200' (per D7)
  - 'buildLegacyUKConfig(1999/00) throws UnsupportedUkTaxYearError'

### 17. T15a B-07 web: mortgage repayment formula and overpayment comparison from the engine (effort M)

- Files: `packages/finance-engine/src/mortgage.ts (add calculateMortgageOverpayment)`, `packages/finance-engine/src/mortgage.test.ts`, `apps/web/app/components/mortgage/MortgageTracker.tsx:69`, `apps/web/app/components/mortgage/RemortgageShockSim.tsx:57-62`, `apps/web/app/components/mortgage/OverpaymentSimulator.tsx:46`, `apps/web/app/components/mortgage/OverpayVsSaveCompare.tsx:67`, `apps/web/app/containers/mortgage/MortgageContainer.tsx:111, 192`, `apps/web/app/components/dashboard/widgets/MortgageWidget.tsx:65`
- Interfaces: export function calculateMortgageOverpayment(loan: number, annualRatePct: number, termMonths: number, monthlyOverpayment: number): { scheduledPayment: number; monthsSaved: number; interestSaved: number; newTermMonths: number }. Replacements call calculateMonthlyMortgagePayment (mortgage.ts:12)
- Tests:
  - 'calculateMortgageOverpayment(200000, 5, 300, 200): monthsSaved and interestSaved equal values from a month-by-month reference loop'
  - '0% rate gives scheduledPayment === loan / months' (edge case the copies lack)
  - Existing web tests for these components still pass (no value change for non-zero rates)

### 18. T15b B-07 web: compound future-value formulas from the engine (effort S)

- Files: `packages/finance-engine/src/forecast.ts (add futureValue)`, `packages/finance-engine/src/forecast.test.ts`, `apps/web/app/components/dashboard/widgets/SavingsWidget.tsx:61`, `apps/web/app/components/dashboard/widgets/ForecastWidget.tsx:60`, `apps/web/app/components/savings/SavingsQuickStartWizard.tsx:75-83`, `apps/web/app/components/pension/PensionQuickStartWizard.tsx:125-126`
- Interfaces: export function futureValue(principal: number, monthlyContribution: number, monthlyRate: number, months: number): number (handles rate 0 without the '|| 1/12' hack at SavingsQuickStartWizard.tsx:77)
- Tests:
  - 'futureValue(10000, 100, 0, 60) === 16000'
  - 'futureValue(10000, 100, 0.004, 60) matches a month-by-month loop to 0.01'

### 19. T15c B-07: thresholds in UI, web and MCP derived from getUkTaxYearRules (effort S)

- Files: `packages/ui/src/patterns/TaxTrapEscapeBanner/TaxTrapEscapeBanner.tsx:22 (+ colocated .test.tsx, .stories.tsx)`, `apps/web/app/components/pension/PensionForecasterCard.tsx:48, 423`, `packages/mcp/src/resources/baseline.resource.ts:69-115`, `packages/mcp/src/mcp.test.ts (or resource test)`
- Interfaces: The banner uses analyzeTaxTrap(grossIncome).isInTaxTrap (strictly > 100000). The MCP guardrails JSON is built from getUkTaxYearRules(getCurrentUkTaxYear()) and states that single year
- Depends on: T2, T8
- Tests:
  - 'TaxTrapEscapeBanner hidden at exactly 100000, shown at 100001'
  - 'uk-fiscal-guardrails Scottish bands and student loans equal getUkTaxYearRules(current) values'

### 20. T16 B-07 mobile: ForecastScreen, ProfileScreen and MortgageScreen call the engine (effort M, needs decision)

- Files: `apps/mobile-companion/src/screens/ForecastScreen.tsx:11-60`, `apps/mobile-companion/src/screens/ProfileScreen.tsx:90-220`, `apps/mobile-companion/src/screens/MortgageScreen.tsx:111-190`
- Interfaces: Use calculateUKEWNITakeHome or calculateUkTax with resolveUkTaxYear(), calculateIrishTakeHome (tax-rules.ts:872), calculateMonthlyMortgagePayment and calculateMortgageOverpayment
- Depends on: T5, T8, T15a
- Tests:
  - The mobile package has no test runner (package.json:13): verify via check-types plus engine vectors; manual Expo smoke check of the three screens
  - If D6(b) is chosen: the guard allow-list includes apps/mobile-companion/ with a dated comment

### 21. T17 CI guard against re-implemented finance maths (effort S)

- Files: `scripts/check-no-local-finance-math.sh (new, modelled on scripts/check-no-mock-auth.sh)`, `package.json:24 (add check:finance-math)`, `.github/workflows/ci-pipeline.yml:44 (add step)`
- Interfaces: Pattern: '\(1 \+ [^)]*\) \*\*|Math\.pow\(1 \+|\b(12570|50270|125140|37700)\b' over apps and packages/ui and packages/mcp; excludes packages/finance-engine, tests, stories, dist and node_modules; same exit-code handling as check-no-mock-auth.sh
- Depends on: T15a, T15b, T15c, T16
- Tests:
  - 'script exits 0 on the cleaned tree'
  - 'script exits 1 when SCAN_ROOTS points at a fixture containing (1 + r) ** n' (mirror any existing check-no-mock-auth test harness)
  - 'script exits non-zero on grep scan error'

## Can start without any decision

- T1 Test-vector catalogue and harness
- T3a Correct 2025/26 student loan thresholds (needs vector sign-off before merge, not a product-owner decision)
- T4 C-02 shared EWNI band function
- T5 C-01 and C-03 in calculateUkTax
- T7 C-07 employer NI from the per-year table
- T8 C-08 one student loan table
- T11 C-13 payoffAchievable and simulated baseline (engine)
- T11b C-13 consumers
- T12 C-14 forecast fixes
- T15a B-07 web mortgage formula and overpayment function
- T15b B-07 web future-value formula

## Review focus

- Taper and band basis. The allowance taper uses adjusted net income (after gross Gift Aid and pension), but bands run on taxable income. Reviewers should check that no function taxes adjusted net income directly, which was the C-03 regression path.
- Rounding drift between wrappers. calculateUKEWNITakeHome rounds tax and NI to whole pounds (tax-rules.ts:1095, 1115) and does not floor the taper (1089). After T5, the same salary must give the same income tax on every page, to the penny.
- Pension treatment differs. calculateUkTax subtracts the employee pension from taxable income even when it is not salary sacrifice (net-pay assumption, uk-tax.ts:362, 377), and calculateUKEWNITakeHome computes student loan on post-pension pay even without sacrifice (tax-rules.ts:1121). The spec is silent; the tax reviewer should rule, and the vectors must pin whichever rule is chosen.
- Throwing on unsupported years can crash rendering. Every app call site needs either a supported year or a caught error. The Tax page iterates every available year (TaxContainer.tsx:246), mobile iterates TAX_YEARS (TaxScreen.tsx:117), and on 6 April 2027 the clock year becomes 2027/28.
- PSA band choice. tax-calculator.ts:501-505 picks the personal savings allowance from gross income compared with higherRateLimit and 50270. After C-02 the PSA must be chosen from the taxpayer's band (taxable income), not gross.
- Recursion and performance in C-13. The minimum-only baseline must not compute its own baseline. Check the cost of two simulations of up to 360 months on every slider move in DebtContainer.
- The C-12 double count (debt-payoff.ts:303, 361) is out of scope, but the property tests in T11 must not assert totalPaymentsGbp, or they will lock in C-12.
- Sign migration. Already-stored synced balances were abs'd. Confirm whether manual entry paths also abs, and decide whether stored values are corrected only on the next sync (no data migration in E4).
- Credit-in-credit liabilities. Provider sign conventions differ by provider (Monzo and Starling adapters in apps/backend/src/providers versus the packages/banking adapters). Verify per provider; do not assume one global rule.
- Scottish Gift Aid and pension band extension (D9), and the advanced band starting at taxable 62,430 when the allowance is tapered. Vectors are needed at 100k, 110k and 125,140 for Scotland.
- Employer NI threshold edge case. A sacrifice that takes pay below the secondary threshold saves only the part above it. Cover it with a vector.
- The 2022/23 mid-year NI blends (tax-rules.ts:387-403) and 2023/24 must be labelled as approximations in the UI if they stay verified:false.
- MCP JSON shape changes in baseline.resource.ts may break external AI clients. Keep the keys and change only the values.
- Name collision. calculateUKTax (ledger) versus calculateUkTax (take-home), plus web's local calculateUKTax (UKTaxCalculator.tsx:704). Reviewers should check that imports resolve to the intended function after the edits.
- The demo data path (apps/web/app/utils/demoData.ts) and the dashboard's hardcoded debtFreeDate 'October 2026' (_index.tsx:243) will still contradict the engine. Out of scope, but they must not be 'fixed' by pinning tests to them.

## Risks

- All tax figures rest on vectors whose values partly come from memory (2025/26 student loans, the 2023/24 NI correction, 2026/27 dividend rates). If the sign-off is skipped, the code will be made precisely wrong. No fix should merge to main until the vectors it consumes have signedOffBy set.
- Visible number changes for high earners: about +£2,000 to +£5,000 on take-home and MCP pages (C-01) and about -£628 on the Tax page (C-02). Users may read this as a regression, so release notes should explain it.
- Removing the number-as-rate overload of calculateEmployerNISavings and throwing on unknown years are breaking API changes. check-types will catch typed callers, but `as any` sites (uk-tax.ts:486, debt-payoff.ts:659) and string-typed years will not be caught.
- Widening the UkTaxYear union can ripple into FinancialBaseline persistence (profile.ts:16, persistence.ts). Stored baselines with '2025/26' stay valid, but stored unknown strings would now throw.
- Scope creep into C-09, C-12 and C-16, which share the same functions. Keep them as separate tickets except for the D8 boundary fold-in.
- Mobile verification is weak because there is no test runner, so B-07 mobile changes rely on types and manual checks.
- The CI guard may flag legitimate literals (for example marketing copy saying £12,570, or tools.$slug.tsx content). The allow-list needs care, or the guard will be disabled.
- Editing flat, non-colocated web components could trigger requests to restructure them under AGENTS.md law 1. Keep E4 to logic-only edits and log restructuring for the design-system epic.

## Rollout

Order:
1. T1 (vectors) goes first. The UK tax reviewer signs it off in parallel with T4, T7, T8, T11, T12 and T15a/b. A person with UK tax knowledge must sign off every vector (signedOffBy set, with GOV.UK source and date) before any tax fix merges to main. Fixes can be developed against provisional vectors on branches.
2. Then T2 (once D1, D5 and D8 are decided), T5, T6 (D9), T3b, T9 (D3), T10 (D4), T13 (D2), T14 (D7), T15c, T16 (D6), and T17 last, once the tree is clean.
3. Release as one 'tax figures corrected' change, with a short changelog of which numbers move (high earners, Scottish users, Gift Aid users, student-loan Plan 1/2/4 users, overdrawn accounts).
4. No database migration is planned. Synced balances self-correct on the next sync; confirm that manual accounts need nothing (T13).
5. Each task runs the four-gate pre-flight (bun run lint, bun run check-types, bun run test, bun run build), plus bun run check:auth and, after T17, check:finance-math.
6. Every UI task needs Light and Dark stories with zero a11y violations wherever a colocated packages/ui component changes (TaxTrapEscapeBanner, DebtSnowballCalculator).
7. After merge, schedule a yearly human task: add the next tax year's tables and vectors before 6 April. Otherwise getCurrentUkTaxYear() throws on 6 April 2027; add an alert or test to make this visible in March.
8. Implementers are spawned per the AGENTS.md subagent model law (sonnet for implementation and review).

## Facts (as cited by the planner)

- Note on the docs: docs/audit is untracked in this worktree (git status shows '?? docs/audit/' and the folder only holds plans/). The audit track files and EPICS.md were read from the main checkout at /Users/marcgallagher/personal/flump/docs/audit. (`/Users/marcgallagher/personal/flump/docs/audit/EPICS.md:209`)
- C-01 still holds. calculateEwniIncomeTax works out the higher band as min(income, 125140+ext) - max(50270+ext, PA). The 40% band does not widen when the allowance is tapered, and the additional rate starts at gross 125,140 rather than taxable 125,140. (`packages/finance-engine/src/uk-tax.ts:190-227 (bug at 209-213)`)
- C-03 still holds. Gross Gift Aid (net x 1.25) is taken off adjusted net income, the taxable income is set equal to adjusted net income, and the same gross Gift Aid also extends the bands. (`packages/finance-engine/src/uk-tax.ts:356-357, 377-392`)
- C-02 still holds in both places. tax-rules uses higherBandWidth = additionalRateThreshold - personalAllowance - basicRateBandWidth (74,870), so 45% starts at taxable 112,570. tax-calculator does the same via higherRateLimit - 12570, and its dividend stack uses the same wrong threshold. (`packages/finance-engine/src/tax-rules.ts:1003-1013; packages/finance-engine/src/tax-calculator.ts:634-647, 649-687`)
- C-06 still holds. calculateScottishIncomeTax hardcodes the 2024/25 band widths (2,306 / 11,685 / 17,101), mixes a gross 75,000 threshold with taxable-income thresholds, and takes no taxYear. A per-year table and a band function already exist and could replace it. (`packages/finance-engine/src/uk-tax.ts:232-282; tax-rules.ts:201-289 (UK_SCOTLAND_INCOME_TAX), 1021-1034 (calculateScottishIncomeTaxOnTaxable)`)
- C-07 still holds. Any year other than '2026/27' gets 13.8% with a 9,100 threshold, and a bare number is accepted as a rate. The file's own table says 2025/26 is 15% with 5,000. Two web callers pass no year, so they get 13.8% and no threshold. (`packages/finance-engine/src/uk-tax.ts:164-185; tax-rules.ts:308-316; apps/web/app/components/pension/PensionForecasterCard.tsx:316; apps/web/app/components/pension/PensionQuickStartWizard.tsx:116`)
- C-08 holds, but the audit put one location in the wrong file. evaluateUkStudentLoan is in debt-payoff.ts, not uk-tax.ts. It checks its own hardcoded 2024/25 table first (plan2 27,295), then STUDENT_LOAN_THRESHOLDS in uk-tax.ts (2025/26 values: 26,065 / 28,470 / 32,745). tax-rules UK_STUDENT_LOANS '2025/26' holds the 2026/27 values (26,900 / 29,385 / 33,795), the same as '2026/27'. (`packages/finance-engine/src/debt-payoff.ts:623-669 (table 628-634); uk-tax.ts:29-44; tax-rules.ts:518-537`)
- A fourth student-loan and Scottish copy exists that the audit did not list. The MCP guardrails resource says taxYears ['2025/26','2026/27'] but hardcodes 2026/27 student-loan thresholds and 2025/26 Scottish bands. (`packages/mcp/src/resources/baseline.resource.ts:69-115`)
- C-10 still holds. effectivePayeSalary = payeIncomeGross > 0 ? payeIncomeGross - payeExpenses : payeSalary, and paye_bonus and paye_benefit records count towards payeIncomeGross. There is no tax-calculator.test.ts at all. (`packages/finance-engine/src/tax-calculator.ts:437-446, 463-465; packages/finance-engine/src (no tax-calculator.test.ts)`)
- C-11 still holds. The dashboard loader adds up r.amount across every tax record, ignoring year and frequency, and multiplies by 0.29. TaxWidget shows this as 'Est. Tax Due ({taxYear})'. The same loader also hardcodes debtFreeDate 'October 2026' and interestSaved = liabilities x 0.18. Those are adjacent problems and outside this epic's findings. (`apps/web/app/routes/_index.tsx:138-146, 229-245; apps/web/app/components/dashboard/widgets/TaxWidget.tsx:181-192`)
- C-13 still holds. The loop is capped at maxMonths (default 360) with no achievability flag. The interest-saved baseline is balance x monthlyRate x (balance/min)/2. calculateMinimumOnly already runs a real simulation (calculateAvalanche with 0 extra). (`packages/finance-engine/src/debt-payoff.ts:205, 259-262, 388-402, 503-505`)
- C-12 (P2, not in E4) sits in the same loop. totalPaymentsGbp = interest + principal while minimum payments are booked as principal, and interestChargedGbp is always 0. (`packages/finance-engine/src/debt-payoff.ts:303-310, 361`)
- C-14 still holds. The baseline pays debt out of monthlySavings*12 and then invests the full savings anyway. The scenario does max(0, savings - extraCost*12), so any shortfall disappears. The ten-year figure reads trajectory[10] regardless of projectionYears. (`packages/finance-engine/src/forecast.ts:74-87, 116, 164-165`)
- C-15 and F-02 still hold. PortfolioSnapshot sets nominalBalance = Math.abs(raw). normalizeAccountBalance returns Math.abs for non-liabilities and is applied to every synced provider account (finance.service.ts:387 now, not 316). enforceSignConvention takes abs for assets. The banking test pins Current -1500 as 1500. (`packages/finance-engine/src/portfolio.ts:158-159; packages/banking/src/server/orchestrator.ts:186-200; apps/backend/src/finance.service.ts:387; packages/banking/src/core/sign-enforcement.ts:37-45; packages/banking/src/server/orchestrator.test.ts:21-24`)
- C-09 (P2, adjacent) still holds. getCurrentUKTaxYear and getTaxYearForDate change year on 1 April (month >= 4) using local time. calculateUkTax defaults to '2025/26'. getTaxYearRemainingDays maps any year other than 2025/26 to 2027. UkTaxYear allows only two values, and unknown years fall back to 2024/25 in one place and 2026/27 in another. (`packages/finance-engine/src/tax-rules.ts:955-963, 1062-1064, 557-558; tax-calculator.ts:147-155, 361; uk-tax.ts:327-332, 346; types.ts:15; profile.ts:16`)
- A new data issue not in the audit. UK_NATIONAL_INSURANCE '2023/24' gives class1 mainRate 0.08. From memory (high confidence), the employee main rate was 12% until 5 Jan 2024 and 10% from 6 Jan 2024; 8% only started on 6 April 2024. Needs human sign-off. (`packages/finance-engine/src/tax-rules.ts:404-420`)
- A new possible issue, medium confidence and needs sign-off. Dividend rates are hardcoded at 8.75% / 33.75% / 39.35% for every year. My recollection is that the November 2025 Budget raised the ordinary and upper dividend rates by 2 points from 6 April 2026 (10.75% / 35.75%). The dividend allowance is year-switched inline. (`packages/finance-engine/src/tax-calculator.ts:508-514, 659-661`)
- The 60% vs 62% ambiguity is still there. analyzeTaxTrap returns marginalRatePct 60 and effectiveMarginalRatePct 62, then calculateTaxTrapRelief overwrites marginalRatePct with 62. estimatedTaxSaved uses 62% while estimatedTaxSavedByEscapingGbp uses 60%. (`packages/finance-engine/src/uk-tax.ts:84-106, 144-158`)
- There are three income tax implementations with different rounding. uk-tax rounds to pennies. calculateUKEWNITakeHome rounds tax, NI and pension to whole pounds and does not floor the allowance taper. tax-calculator does not round but floors the taper. (`packages/finance-engine/src/uk-tax.ts:226, 303; tax-rules.ts:1082, 1089, 1095, 1115; tax-calculator.ts:488-492`)
- Money is held in the database as decimal(12,2) (exact). The pg driver returns these as strings, which the engine parses into JS floats in pounds. There are about 160 Math.round sites across the engine modules, and around 70 files import @flump/finance-engine. (`apps/backend/src/entities/account.entity.ts:27-28; tax-record.entity.ts:29-30; packages/finance-engine/src/tax-calculator.ts:16, 192-193`)
- B-07 is wider than the audit listed. The mortgage repayment formula is hand-written in 8 web places and 1 mobile place. The compound future-value formula is hand-written in 4 web components. The engine already exports calculateMonthlyMortgagePayment, calculateMortgageAmortization and calculateCompoundTrajectory. (`apps/web/app/components/mortgage/MortgageTracker.tsx:69; RemortgageShockSim.tsx:61; OverpaymentSimulator.tsx:46; OverpayVsSaveCompare.tsx:67; apps/web/app/containers/mortgage/MortgageContainer.tsx:111,192; apps/web/app/components/dashboard/widgets/MortgageWidget.tsx:65; SavingsWidget.tsx:61; ForecastWidget.tsx:60; apps/web/app/components/savings/SavingsQuickStartWizard.tsx:75-83; apps/web/app/components/pension/PensionQuickStartWizard.tsx:125-126; apps/mobile-companion/src/screens/MortgageScreen.tsx:130; packages/finance-engine/src/mortgage.ts:12,70; forecast.ts:182`)
- The mobile app hand-codes UK tax and NI (with 2026/27 student-loan thresholds and no tax year) and its own Irish take-home. The engine already has calculateIrishTakeHome, so the audit's suggestion to move Irish take-home into the engine is already done. The mobile package has no test script. (`apps/mobile-companion/src/screens/ForecastScreen.tsx:11-60; ProfileScreen.tsx:90-220; packages/finance-engine/src/tax-rules.ts:872-945; apps/mobile-companion/package.json:13`)
- There are more hardcoded tax-trap thresholds in app and UI code. TaxTrapEscapeBanner uses grossIncome >= 100000, which flags exactly £100,000 as in the trap. (`packages/ui/src/patterns/TaxTrapEscapeBanner/TaxTrapEscapeBanner.tsx:22; apps/web/app/components/pension/PensionForecasterCard.tsx:48, 423`)
- Naming hazard. The engine exports both calculateUKTax (the self-assessment ledger in tax-calculator.ts) and calculateUkTax (take-home in uk-tax.ts), and web defines a third local calculateUKTax wrapper. (`packages/finance-engine/src/tax-calculator.ts:355; uk-tax.ts:345; apps/web/app/components/forecast/UKTaxCalculator.tsx:704`)
- Pattern for the CI guard. E1 added scripts/check-no-mock-auth.sh with an allow-list, wired as root 'check:auth' and run as a CI step after lint. There is no fast-check dependency in the repo. (`scripts/check-no-mock-auth.sh:1-30; package.json:24; .github/workflows/ci-pipeline.yml:44`)
- Consumers that inherit wrong figures today: web onboarding, InteractiveFinancialTeaser (web and marketing), MCP uk-tax-trap and section24 tools, ai-context-pack, TaxContainer (computes every available year), mobile TaxScreen, and UserProfilePanel and PensionContainer through calculateUKEWNITakeHome. (`apps/web/app/routes/app.onboarding.tsx:175; apps/marketing/src/components/InteractiveFinancialTeaser.tsx:214; packages/mcp/src/tools/uk-tax-trap.tool.ts:72-84; packages/mcp/src/tools/section24.tool.ts:69; packages/finance-engine/src/ai-context-pack.ts:259; apps/web/app/containers/tax/TaxContainer.tsx:244-249; apps/mobile-companion/src/screens/TaxScreen.tsx:116-119`)
- Hand-computed vectors from the current tables (EWNI 2025/26 and 2026/27 bands are identical; my arithmetic, to be signed off): 100,000 gives 27,432; 110,000 gives 33,432; 125,140 gives 42,516; 150,000 gives 53,703; 60,000 gives 11,432; 60,000 with £1,000 net Gift Aid gives 11,182; employee NI on 60,000 is 3,210.60; employer NI saving on 60,000 with 3,000 sacrificed in 2025/26 is 450; Plan 2 on 35,000 is 587.70 in 2025/26 (threshold 28,470) and 505.35 in 2026/27 (29,385); Scottish 2026/27 on 50,000 gross is 8,982.05. (`packages/finance-engine/src/tax-rules.ts:147-168, 276-288, 438-471; docs/audit/C-correctness.md:17,26,35,71`)

## Fact-check

27 claims checked; 14 not confirmed.

- **unclear**: Fourth student-loan/Scottish copy in MCP baseline.resource.ts — Not opened.
- **unclear**: C-11 dashboard loader — Not opened.
- **unclear**: C-13 debt payoff loop — Not opened beyond the evaluateUkStudentLoan table at debt-payoff.ts:628.
- **unclear**: C-12 interestChargedGbp always 0 — 
- **unclear**: C-14 forecast baseline — 
- **unclear**: C-15/F-02 abs of balances — 
- **unclear**: C-09 tax year boundary and fallbacks — 
- **unclear**: 60 vs 62 ambiguity in analyzeTaxTrap — 
- **false**: Three income tax implementations with different rounding: tax-rules rounds whole pounds and does not floor the allowance taper — Whole-pound rounding of tax (tax-rules.ts:1095) and NI (:1115) is correct. But the taper IS floored: tax-rules.ts:1087 uses Math.max(0, personalAllowance - reduction).
- **unclear**: Money stored as decimal(12,2); about 160 Math.round sites; around 70 importing files — 
- **unclear**: B-07 duplicated mortgage and FV formulas — 
- **unclear**: Naming hazard calculateUKTax / calculateUkTax — 
- **unclear**: Consumers inheriting wrong figures — 
- **unclear**: Hand-computed vectors — Not recomputed. Note that tax-rules.ts holds 2026/27 student-loan values under the '2025/26' key, so the Plan 2 2025/26 vector (28,470) will not come from tax-rules.

Issues the checker says were missed:

- packages/finance-engine/src/tax-rules.ts:521-523: UK_STUDENT_LOANS '2025/26' duplicates the 2026/27 values (26,900 / 29,385 / 33,795). Any year-table-driven calculator will return wrong 2025/26 loans unless this is corrected first. The planner's 2025/26 Plan 2 vector of 28,470 conflicts with this table.
- packages/finance-engine/src/uk-tax.ts:36-44: STUDENT_LOAN_THRESHOLDS is a year-less copy and also holds the Plan 5 threshold of 25,000. It disagrees with both debt-payoff.ts:628-634 (plan2 27,295) and tax-rules. That makes three disagreeing student-loan tables for the engine, so the canonical API must delete two.
- packages/finance-engine/src/tax-rules.ts:1085-1089 and 1095: calculateUKEWNITakeHome floors the taper at 0 but rounds tax and NI to whole pounds, and uses a different taper input (adjustedGrossForTax). Pinning penny vectors will break this wrapper's existing tests, so tax-rules.test.ts expectations need an explicit update.
- packages/finance-engine/src/uk-tax.ts:170-173: calculateEmployerNISavings treats a bare number as a percentage. Any wrapper that adds taxYear resolution has to preserve that overload, or callers that pass 13.8 will break.
- packages/finance-engine/src/uk-tax.ts:209-213: the 40% band bug depends on UK_TAX_CONSTANTS.TAX_TRAP_UPPER_THRESHOLD (125,140). Deleting or retuning that constant also affects the tax-trap analysis, so C-01 and the trap semantics (D7) are coupled.
