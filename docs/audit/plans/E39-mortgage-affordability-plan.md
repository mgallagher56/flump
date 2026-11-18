# E39. Mortgage affordability: estimates from your own figures

Decisions: open

> Status: plan for owner approval. No code. Written 2026-11-18 against `origin/main`. Paths are relative to the repository root.

## 1. Summary and why it matters

- Three estimates: a borrowing range, a monthly payment the user's figures leave room for, and payments if rates move.
- Every figure is an illustration from assumptions the user can see and edit. Nothing is a lender's decision.
- One engine formula, reused. Web holds no formulas.
- Nothing new is stored in the first version.
- No lender names, products, scores or verdicts.

Who it serves, with equal weight:

- **Renters saving for a first home**: see what a payment and a deposit work out to. Renting is never framed as a stage to leave.
- **Owners remortgaging or moving**: see a new loan size beside their saved mortgage.
- **People whose fix is ending**: see the payment at rates above and below today's.

## 2. What exists today, and the gaps

| Area | Where | Notes |
| --- | --- | --- |
| Payment formula | `packages/finance-engine/src/mortgage.ts:16` (`repaymentPerMonth`), `:32`, `:294` | One formula, handles 0%. No inverse (payment to loan). |
| Balance projection | `mortgage.ts:69` `projectAmortisedBalance` | Usable for the balance on the day a fix ends. |
| Cost summary, overpayment | `mortgage.ts:320`, `:370`, `:488` | Existing loans only. |
| Mortgage page | `apps/web/app/routes/app.mortgage.tsx`, `apps/web/app/containers/mortgage/MortgageContainer.tsx:670` | Title "Your mortgage". A user with no mortgage sees an empty state (`:738`). |
| Rate what-if | `apps/web/app/features/mortgage/components/RemortgageShockSim/RemortgageShockSim.tsx` | One new rate after the fix ends. See gaps. |
| Scenario zone | `packages/ui/src/patterns/ScenarioZone/ScenarioZone.tsx:12-14`, `apps/web/app/hooks/useScenarioState.ts` | Mortgage zone already holds three tools, the zone's limit (`MortgageContainer.tsx:932-990`). |
| Housing details (E32) | `packages/finance-engine/src/picture/selectors/housing-cost.ts:57`, `:130`, `:155`; `apps/web/app/features/housing/components/HousingDetails` | Saved status, monthly cost, fix-end date. |
| Deposit timeline (E32) | `packages/finance-engine/src/deposit-timeline.ts:19`; `apps/web/app/features/savings/components/DepositTimeline` | Scenario only. The target is not stored (`SavingsContainer.tsx:157-160`). |
| Take-home, budget | `picture/selectors/take-home.ts:28`, `budget-totals.ts:50`, `commitments.ts:32`, `safe-to-spend.ts:33`, `months-of-cover.ts:31` | "Left over each month" (`BudgetOverview.tsx:81`) and Breathing room. |
| Joint shares (E34) | `joint-share.ts`, `budget-totals.ts:38`, `apps/web/app/features/mortgage/jointMortgage.ts:9` | Joint rows count at the user's share. The mortgage page uses the whole loan. |
| MCP | `packages/mcp/src/tools/read/getFinancialSnapshot.ts:34`; `simulate/compareMortgageOverpayVsInvest.ts` | Balance only. The simulate list is frozen (`simulate/index.ts:9`). |
| Rounding | `apps/web/app/utils/roundEstimate.ts:8`, `:18` | "~" and three significant figures (UX rule B9). |

Gaps:

1. No affordability, income-multiple, stamp duty or payment-to-loan code exists anywhere (searched engine, web, backend, MCP).
2. `RemortgageShockSim` opens at a hardcoded 5.2% (near line 93) and falls back to 25 years (near line 64). Both are invented defaults.
3. It works out months left in web code (near lines 113-121), duplicating the engine's `fixedRateEnd`.
4. It prices the new rate on today's balance, not the balance when the fix ends.
5. E32 has no plan file in `docs/audit/plans/`. Its EPICS block says two points were "not re-checked in code".

## 3. The advice boundary

Mortgage advice is regulated. Article 53A of the Regulated Activities Order covers "advice on the merits" of "entering into a particular regulated mortgage contract" (read on legislation.gov.uk, 2026-11-18). The design stays away from that by never discussing a particular contract, lender or product.

Perimeter risks and how each is handled (rules R1 to R8 are in `docs/compliance/advice-boundary-policy.md`):

| Risk | Handling | Rule |
| --- | --- | --- |
| "You can borrow £X" reads as a lender decision | Labels say "estimate" and name the assumption. A standing line says it is not a lender's decision or an offer. | R1, R6 |
| A default multiple or rate reads as Flump's view | Every assumption is labelled "Assumption", editable, and chosen by the user or the owner (MA2, MA5). | R1 |
| "Affordable" is a verdict | The word never appears on the page. Figures are "left each month before housing". | R2, copy 2.3 |
| Nudging renters to buy | Same page for every user. No trigger by status, income or savings. | R4 |
| Saving a what-if | No apply button. Scenario inputs never write to saved data. | R5 |
| Lender or broker names | None (MA6). | R3 |

Not confirmed, for the E29b solicitor: whether a generic calculator with user-set assumptions is outside Article 53A; whether it is a financial promotion; whether the FCA's lender affordability rules (MCOB 11.6, page could not be read) bear on a non-lender tool.

## 4. The three estimates

### a. Estimated borrowing range (two views, side by side, same weight)

**Income view.** Inputs: yearly income before tax (prefilled from saved salary), an optional second person's income (typed, not stored), a multiple. Formula: total income times the multiple. Assumptions shown: the multiple, and "Lenders set their own limits and checks." Source: none cited. The Bank of England loan-to-income page could not be read, so no "typical" multiple is stated. The multiple is a user-editable assumption (MA2).

**Budget view.** Inputs: a monthly payment (prefilled from 4b), a rate, a term. Formula: the payment formula run backwards. Loan = payment x ((1 + r)^n - 1) / (r x (1 + r)^n), with r a twelfth of the yearly rate and n months. At 0%, loan = payment x n. Assumptions shown: repayment mortgage, one rate for the whole term, no fees.

With a typed deposit, both views also show property price (loan plus deposit) and loan to value (loan / price).

### b. Monthly payment your figures leave room for

Inputs, all saved: take-home pay (`selectTakeHome`), essential budget entries outside the "housing" category (`BudgetContainer.tsx:62`), debt commitments (`essentialCommitments`). Formula: take-home less essentials without housing, less debt payments. Planned savings and other spending are shown as their own lines, each with a switch in the zone (MA3). Joint entries count at the user's share. The current rent or mortgage payment sits beside it as a fact, never as a comparison verdict. Shown as the user's figures. No threshold, no percentage-of-income benchmark, no colour.

### c. Rate change what-ifs

Inputs: loan, rate, term, and a change in percentage points. Output: three payments, at the rate, at plus N and at minus N. A lower rate stops at 0%.

- **New loan:** uses the loan from 4a.
- **Saved mortgage:** uses saved balance, rate and term (`account.entity.ts:96-117`), repayment or interest-only as saved.
- **Fix ending:** balance on the fix-end date from `projectAmortisedBalance`, then the payment over the term left. Replaces gaps 2 to 4.

### Considered

| Topic | Verdict |
| --- | --- |
| Deposit and loan to value | Include, as typed scenario input. |
| Stamp duty (SDLT, LBTT, LTT) | Leave out of version one (MA7). Three regimes, first-time buyer relief, extra-home rates, and changes not tied to tax years. Later: a sourced `uk-property-transaction-tax.ts` beside `uk-rule-sources.ts:17`. |
| Other buying costs | One optional typed field, taken off the deposit. No Flump figures. |
| Term and age at end | Term is a slider. Age line from saved birth year (`user-profile.entity.ts:277`) is MA11. |
| Joint applications | Typed second income only. E34 has no household yet. The budget view states "This uses your own figures." |
| Interest-only | Saved mortgages only. Not offered for a new loan. |
| Shared ownership | Leave out. Rent on the unowned share needs its own model. |
| Self-employed income | No special handling. Income is editable. No lender averaging rules. |

## 5. Where it lives

Recommendation: a new page, `/app/mortgage-estimates`, linked from the mortgage page (both states), the Savings deposit tool and the housing row. The mortgage zone is full, and a renter's mortgage page is an empty state.

Page order follows UX rule H14 (`docs/ux/UX-GUIDELINES.md:52`): `PageHeader`, `HeroFigure`, `KpiStrip` (three items), "Your details", one `ScenarioZone` with three tools, each a `SimulatorSplitLayout` with `SliderField` inputs and one `ResultBlock`. The hero is 4b, built from saved details (rule S10). The breakdown table has under 8 rows; a year-by-year table, if added, goes in a `CollapsibleDrawer`.

Nothing typed twice: salary, take-home, budget, debts, housing cost, mortgage balance, rate, term and fix-end date all prefill from saved details. The rate tool for a saved mortgage also replaces the middle tab on the mortgage page, so there is one rate tool.

## 6. Proposed wording

| Place | Wording |
| --- | --- |
| Page title | Mortgage estimates |
| Page description | Estimates of a loan size and monthly payment, from your figures and the assumptions you set. |
| Hero label | Left each month before housing |
| Hero note | Your take-home pay, less your essentials and debt payments. Housing is not counted. |
| KPI labels | Take-home pay / Essentials without housing / Debt payments |
| Zone title | Model a mortgage |
| Tool tabs | From a monthly payment / From income / If rates change |
| Result, budget view | Estimated loan for this payment: ~£180,000 |
| Result, income view | Income times your multiple: ~£260,000 |
| Deposit line | With a £30,000 deposit: property price ~£210,000, loan to value 86% |
| Assumption labels | Monthly payment / Interest rate / Term in years / Deposit / Other buying costs / Yearly income before tax / Another person's yearly income / Multiple of yearly income |
| Multiple helper | Assumption: you choose this. Lenders set their own limits and checks. |
| Rate helper | Assumption: one rate for the whole term. |
| Rate control | Rate change, in percentage points |
| Rate results | Payment at 4.5% / Payment at 6.5%, 2 points higher / Payment at 2.5%, 2 points lower |
| Fix-end basis | Starting from your estimated balance when your fixed rate ends in March 2027. |
| Standing line | This is an estimate from your figures and the assumptions shown. It is not a lender's decision or a mortgage offer. |

`ProjectionNotice` stays unchanged (R6). The standing line becomes fixed wording in `packages/finance-engine/src/disclaimers.ts`.

## 7. Data

- **Stored:** nothing new. Scenario inputs live in `useScenarioState` and vanish on leaving.
- **Privacy:** no change to `apps/backend/src/modules/privacy/account-export.service.ts` or deletion. If MA9 later stores inputs, both must cover them in the same PR.
- **MCP (optional S3):** one simulate tool with neutral keys (`estimatedLoanGbp`, `monthlyPaymentGbp`, `assumptions`, `notice`). It needs the frozen list reopened (MA10).

## 8. Slices

**S1. Engine (effort M).**

- `packages/finance-engine/src/mortgage.ts`: add `calculateLoanFromMonthlyPayment(monthlyPaymentGbp, annualRatePct, termMonths)` beside the formula; add `compareMortgageRates` and a fix-end helper reusing `projectAmortisedBalance`.
- New `picture/selectors/housing-room.ts`, following `safe-to-spend.ts:33` (`Figure`, unknown never 0).
- New `mortgage-affordability.ts` for the income view; export from `index.ts`; notice in `disclaimers.ts`.
- Laws: AGENTS.md section 14 (hand-worked tests), one engine, section 11 for strings.

Hand-worked test cases:

1. **Income view.** £38,000 + £27,000 = £65,000. Times 4 = £260,000. Times 4.5 = £292,500.
2. **0% rate, payment to loan.** £900 x 300 months = £270,000.
3. **Payment to loan at 4.5% over 25 years.** r = 0.00375, n = 300. 1.00375^300 = 3.07374. £1,000 x 2.07374 / (0.00375 x 3.07374) = £179,910.32.
4. **Rate rise, £200,000 over 25 years.** At 4%: 1.0033333^300 = 2.71377; payment = 200,000 x 0.0033333 x 2.71377 / 1.71377 = £1,055.67. At 6%: 1.005^300 = 4.46497; payment = 200,000 x 0.005 x 4.46497 / 3.46497 = £1,288.60. Rise: £232.93. At 2%: 1.0016667^300 = 1.64804; payment = £847.71.
5. **Rate fall floored at 0%.** £120,000 over 240 months at 1.5% less 2 points is 0%: £120,000 / 240 = £500.00.
6. **Fix ends in two months.** £100,000 at 3%, paying £500. Month 1: interest £250.00, balance £99,750.00. Month 2: interest £249.38, balance £99,499.38. At 5% over 238 months: 1.0041667^238 = 2.69018; payment = £659.87.
7. **Room before housing.** £2,600 - £950 - £150 = £1,500. With savings £200: £1,300. With other spending £400: £900.

**S2. Web (effort L).** New `apps/web/app/routes/app.mortgage-estimates.tsx` and container. New colocated components under `apps/web/app/features/mortgage/components/` (`HousingRoomSummary`, `LoanFromPaymentTool`, `IncomeMultipleTool`, `RateChangeTool`), each with styles, stories, test and index. Replace `RemortgageShockSim` with `RateChangeTool` on the mortgage page. Links from `MortgageContainer.tsx`, `DepositTimeline` and navigation. Laws: AGENTS.md sections 1, 2 (semantic tokens, tabular numbers), 3, 4, 10, 11. Tests: component tests, stories in light and dark, an E2E case in `apps/e2e/tests/mortgage.spec.ts`, new visual baselines. One row in `docs/audit/plans/E12-mobile-parity-log.md` for the changed mortgage rate tool.

**S3. MCP (effort S, optional).** Only after MA10.

Verification per slice: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run check:laws`, tests for changed packages; CI runs the full suite and build.

## 9. Blocked by and dependencies

- **E29a:** the wording in section 6 and the standing line need owner approval before S2 merges.
- **E29b:** solicitor view before anyone beyond the friends beta (MA12).
- **Tax vectors:** no new tax calculation. Take-home is reused with its existing notices, so no new sign-off.
- **Work in flight on 2026-11-18:** UX Batch E changes the budget editor, Profile and Self Assessment pages, and a design-fix PR touches the mortgage page. S2 starts after those merge.

## 10. Owner decisions

| Id | Question | Options | Recommendation | Flag |
| --- | --- | --- | --- | --- |
| MA1 | Where it lives | A new page; B mortgage page section; C housing details | A | |
| MA2 | Income multiple default | A empty until typed; B a number the owner picks; C a cited regulator figure | B, owner names the number; C only once a primary source is read | Outside source, regulatory |
| MA3 | What "left before housing" subtracts | A essentials and debts; B plus savings; C plus other spending | A as the headline, B and C as switches | |
| MA4 | Section 6 wording and the standing line | Approve, or edit | Approve | Regulatory wording |
| MA5 | New-loan rate and rate-change defaults | A empty rate, change of 1 point; B owner-picked rate; C a live rate feed | A; also removes the hardcoded 5.2% | C names an outside service |
| MA6 | Lender names, products, broker links | A none; B a MoneyHelper line; C lender links | A | Outside service, regulatory |
| MA7 | Stamp duty | A leave out, with a typed costs field; B England and Northern Ireland; C all three | A | Outside source |
| MA8 | Second income | A typed, not stored; B wait for E34 household | A | |
| MA9 | Store scenario inputs | A nothing stored; B save one set per user | A | Stored user data |
| MA10 | MCP tool | A defer; B reopen the frozen list | A | Model provider, DPIA |
| MA11 | Age at end of term line | A leave out; B plain fact when birth year is saved | A; it can read as a judgement | |
| MA12 | Release gate | A friends beta until E29b; B open | A | Regulatory |

## 11. The strongest argument against

Lender decisions depend on credit files, criteria and stress rates Flump cannot see. A figure labelled "estimate" may still be read as "what I can borrow", and a refusal after that hurts. Free calculators exist on MoneyHelper and lender sites. This sits nearer the regulated perimeter than any current page, before the solicitor has given a view. The honest value is narrower: the user's own budget figures, already saved, turned into a payment and a loan without retyping.

## Not verified

- The Bank of England loan-to-income flow limit and any "typical" multiple: the pages could not be read; nothing is stated.
- FCA MCOB 11.6 and the withdrawn affordability test: not read.
- LBTT and LTT rates: not read. The gov.uk SDLT page was read only to confirm it has bands and a first-time buyer relief.
- Whether a generic calculator is outside Article 53A, or is a financial promotion: solicitor question.
- How an owner's mortgage payment is classed in budget entries (housing or debt category) in real data.
- Line numbers inside `RemortgageShockSim.tsx` are approximate.
- Whether the architecture laws on main need five files or four for `features/mortgage` components.
- The current tax-vector sign-off state behind take-home.
- E32's two "not re-checked in code" points remain unchecked.
- Worked examples were checked with a calculator script, not against the engine.
