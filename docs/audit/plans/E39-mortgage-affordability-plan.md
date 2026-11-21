# E39. Mortgage affordability: estimates from your own figures

Decisions: accepted on 21 November 2026

> Status: accepted by the owner on 2026-11-21 with changes to MA2, MA5 and MA7 (section 10a). Where section 10a differs from the text above it, section 10a wins. No code yet.
>
> Earlier status: plan for owner approval. No code. Written 2026-11-18 against `origin/main`. Paths are relative to the repository root.

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
| Scenario zone | `packages/ui/src/patterns/ScenarioZone/ScenarioZone.tsx:30` (UX rule S6), `apps/web/app/hooks/useScenarioState.ts` | Mortgage zone already holds three tools, the zone's limit (`MortgageContainer.tsx:932-990`). |
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

**Income view.** Inputs: yearly income before tax (prefilled from saved salary), an optional second person's income (typed, not stored), a multiple. Formula: total income times the multiple. Assumptions shown: the multiple, and "Lenders set their own limits and checks." Source: none cited. The Bank of England loan-to-income page could not be read, so no "typical" multiple is stated. The multiple is a user-editable assumption (MA2). **Superseded by section 10a (MA2): a range of 4 to 4.5 times income.**

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
| Stamp duty (SDLT, LBTT, LTT) | **Superseded by section 10a (MA7): an estimate is shown.** Was: Leave out of version one (MA7). Three regimes, first-time buyer relief, extra-home rates, and changes not tied to tax years. Later: a sourced `uk-property-transaction-tax.ts` beside `uk-rule-sources.ts:17`. |
| Other buying costs | One optional typed field, taken off the deposit. No Flump figures, except the stamp duty estimate (section 10a). |
| Term and age at end | Term is a slider. Age line from saved birth year (`user-profile.entity.ts:277`) is MA11. |
| Joint applications | Typed second income only. E34 has no household yet. The budget view states "This uses your own figures." |
| Interest-only | Saved mortgages only. Not offered for a new loan. |
| Shared ownership | Leave out. Rent on the unowned share needs its own model. |
| Self-employed income | No special handling. Income is editable. No lender averaging rules. |

## 5. Where it lives

Recommendation: a new page, `/app/mortgage-estimates`, linked from the mortgage page (both states), the Savings deposit tool and the housing row. The mortgage zone is full, and a renter's mortgage page is an empty state.

Page order follows UX rule H14 (`docs/ux/UX-GUIDELINES.md:52`): `PageHeader`, `HeroFigure`, `KpiStrip` (three items), "Your details", one `ScenarioZone` with three tools, each a `SimulatorSplitLayout` with `SliderField` inputs and one `ResultBlock`. The hero is 4b, built from saved details (rule S10). The breakdown table has under 8 rows; a year-by-year table, if added, goes in a `CollapsibleDrawer`.

Rule S6 allows at most three inputs in view per tool. Each loan tool shows its three main inputs. Deposit and other buying costs sit behind a small outline button with a chevron, labelled "Deposit and buying costs".

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

**S1. Engine (effort M).** Section 10a adds to this slice: the income view returns a range, and one file holds the default rates by loan to value. Section 10a also adds slice S1b, the stamp duty estimate.

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
6. **Fix ends in two months.** £100,000 at 3% with 240 months left, paying £500. Month 1: interest £250.00, balance £99,750.00. Month 2: interest £249.38, balance £99,499.38. At 5% over 238 months: 1.0041667^238 = 2.69018; payment = £659.87.
7. **Room before housing.** £2,600 - £950 - £150 = £1,500. With savings £200: £1,300. With other spending £400: £900.

**S2. Web (effort L).** New `apps/web/app/routes/app.mortgage-estimates.tsx` and container. New colocated components under `apps/web/app/features/mortgage/components/` (`HousingRoomSummary`, `LoanFromPaymentTool`, `IncomeMultipleTool`, `RateChangeTool`), each with styles, stories, test and index. Replace `RemortgageShockSim` with `RateChangeTool` on the mortgage page. Links from `MortgageContainer.tsx`, `DepositTimeline` and navigation. Laws: AGENTS.md sections 1, 2 (semantic tokens, tabular numbers), 3, 4, 10, 11. Tests: component tests, stories in light and dark, an E2E case in `apps/e2e/tests/mortgage.spec.ts`, new visual baselines. One row in `docs/audit/plans/E12-mobile-parity-log.md` for the changed mortgage rate tool.

**S3. MCP (effort S, optional).** Only after MA10.

Verification per slice: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run check:laws`, tests for changed packages; CI runs the full suite and build.

## 9. Blocked by and dependencies

- **E29a:** the wording in section 6 and the standing line need owner approval before S2 merges.
- **E29b:** solicitor view before anyone beyond the friends beta (MA12).
- **Tax vectors:** take-home is reused with its existing notices, so it needs no new sign-off. **Superseded in part by section 10a (MA7): the stamp duty estimate is a new tax calculation and needs the Fable decider's check before S1b merges.**
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

## 10a. Owner decisions, 21 November 2026

Owner's words: "MA2. Default income multiple should be ~4.5x. Do some research on this to make sure, but this is good generally guide. Maybe give a range between 4 and 4.5 to estimates being too wide of the mark." "MA5. ~4.49-4.94% for a ~90% ltv. The lowest I can find is 4.24-4.44% for 60% and below LTV, so between those LTVs will be a sliding scale at every 10% ltv increment." "MA7. Give an estimated stamp duty figure." "Accept the other decisions".

MA1, MA3, MA4, MA6 and MA8 to MA12 are accepted as recommended. The three changed answers:

**MA2: the income view shows a range, 4 to 4.5 times income.**

- The result is a range, low to high: income times 4 and income times 4.5. Both multiples are editable assumptions. This replaces the single multiple in section 4a and the "Income times your multiple" result in section 6.
- Research on 2026-11-21. Read on the Bank of England's site that day ("High loan to income (LTI) lending" and policy statement PS19/26, "High loan to income lending", published 14 October 2026): lending "at or greater than 4.5 times income" counts as high, and is held to a 15% share of new mortgage lending; PS19/26 removes the lender-by-lender 15% cap from 28 October 2026 and keeps 15% as a limit across the market. From search results only, pages not opened: consumer guides (Rightmove, Experian, Which?) describe typical limits of about 4 to 4.5 times income, with some lenders offering 5.5 to 6 times since 2025. So 4 to 4.5 is a fair general guide and not a ceiling. No primary source gives a "typical" multiple; the range is the owner's decision.
- Helper wording (the coordinator's draft, replacing "Multiple helper" in section 6): "Assumption: 4 to 4.5 times yearly income. Lenders set their own limits and checks. You can change these." No source is named on the page and no claim is made about what lenders do.
- Hand-worked case 1 already covers both ends: £65,000 times 4 = £260,000; times 4.5 = £292,500.

**MA5: the new-loan rate defaults to a range that depends on loan to value.**

The owner's figures are for a loan to value of 60% or less and of about 90%. The steps between are a straight line, worked here:

| Loan to value | Low rate | High rate | Working |
| --- | ---: | ---: | --- |
| 60% or less | 4.24% | 4.44% | Owner's figures |
| Over 60% to 70% | 4.32% | 4.61% | 4.24 + (0.25 / 3) = 4.323; 4.44 + (0.50 / 3) = 4.607 |
| Over 70% to 80% | 4.41% | 4.77% | 4.24 + 2 x (0.25 / 3) = 4.407; 4.44 + 2 x (0.50 / 3) = 4.773 |
| Over 80% to 90% | 4.49% | 4.94% | Owner's figures |
| Over 90% | none | none | No default: the owner gave no figure. The user types a rate |

- With no deposit typed there is no loan to value, so the rate is empty until typed (the original option A).
- The payment and loan results show a range from the low and high rate. The user can replace the range with one rate of their own.
- The table lives in one engine file (for example `packages/finance-engine/src/mortgage-rate-assumptions.ts`) with an `asOf` date of November 2026 and the note that the figures are the owner's reading of the market. Pages and tools read it from there; no page holds a rate. The page shows the date: "Assumption: rates seen in November 2026 for this loan to value. You can change it."
- The figures go stale. When `asOf` is more than six months old the page says so, in a plain line beside the rate. The existing banner (`packages/ui/src/patterns/TaxRatesStatusBanner`) works by tax year and does not do this; the line is new work in S2. Updating the table is an owner decision each time.
- The rate-change default stays a change of 1 point. The hardcoded 5.2% in `RemortgageShockSim` goes.
- Not verified: the rates themselves. They are the owner's figures and were not checked against any source.
- For the E29b solicitor: whether default rates by loan to value change the view on Article 53A or financial promotions.

**MA7: an estimated stamp duty figure is shown.**

- The coordinator's reading of the owner's words, to be corrected if wrong: the estimate covers all three regimes (Stamp Duty Land Tax in England and Northern Ireland, Land and Buildings Transaction Tax in Scotland, Land Transaction Tax in Wales), because a figure from the wrong regime would be a wrong number. The tool asks "Where is the property?", prefilled from the saved tax region and not stored.
- Version one covers a main home bought by one or more people who own no other home, with a "first home" switch for first-time buyer relief where the regime has one. Higher rates for additional homes and for non-UK residents are not modelled; the page says so.
- New engine file `packages/finance-engine/src/uk-property-transaction-tax.ts`, with every band, rate and relief read from the primary source on the day (GOV.UK, Revenue Scotland, the Welsh Revenue Authority) and cited in `uk-rule-sources.ts`. Hand-worked tests per regime (AGENTS.md section 14). The figures are tax figures: an independent Fable decider checks the table against the sources before merge, as for other tax figures.
- The figure is taken off the deposit with other buying costs, shown as its own line: "Estimated stamp duty: ~£2,500". In Scotland and Wales the line uses the tax's own name.
- The figure is a tax output, so it carries the unverified notice the advice boundary policy requires for one (R6), in the same form as other tax estimates.
- This is a new slice, S1b, after S1. S2 shows the line only once S1b has merged.

**The coordinator's readings, not the owner's words:** the 70% and 80% steps are a straight line between the owner's two points; each band takes the rate of its upper end; over 90% has no default; with no deposit the rate is empty; the six-month stale line; all three stamp duty regimes, the "first home" switch and what version one leaves out; and every line of wording in this section. MA4 approved the wording in section 6 as it stood. The new lines here (the multiple helper, the rate line, the stale line, the stamp duty line and the "Where is the property?" question) were not in what the owner saw and need the owner's approval under E29a before S2 merges.

**One home per value (AGENTS.md section 16).** The owner asked on 2026-11-21 that this feature keep to the single source of truth rule. Every prefilled figure (salary, take-home, essentials, debt payments, housing cost, mortgage balance, rate, term, fix-end date, tax region) is read from its one home through the engine's picture selectors, never recomputed or copied in web code. "Left each month before housing" is one engine selector (`housing-room.ts`) used by every place that shows it. The rate table, the multiples and the property tax bands each have one engine file. Nothing new is stored (MA9), so the value map gains no stored fact; the new shared figures are added to `docs/system/value-map.yaml` in the PR that adds them.

## 11. The strongest argument against

Lender decisions depend on credit files, criteria and stress rates Flump cannot see. A figure labelled "estimate" may still be read as "what I can borrow", and a refusal after that hurts. Free calculators exist on MoneyHelper and lender sites. This sits nearer the regulated perimeter than any current page, before the solicitor has given a view. The honest value is narrower: the user's own budget figures, already saved, turned into a payment and a loan without retyping.

## Not verified

- The Bank of England loan-to-income flow limit: read on 2026-11-21 (section 10a). A "typical" multiple has no primary source; the 4 to 4.5 range is the owner's decision.
- FCA MCOB 11.6 and the withdrawn affordability test: not read.
- LBTT and LTT rates: not read. The gov.uk SDLT page was read only to confirm it has bands and a first-time buyer relief.
- Whether a generic calculator is outside Article 53A, or is a financial promotion: solicitor question.
- How an owner's mortgage payment is classed in budget entries (housing or debt category) in real data.
- Whether debt commitments overlap essential budget entries, which would count a payment twice in "left each month before housing".
- Line numbers inside `RemortgageShockSim.tsx` are approximate.
- Whether the architecture laws on main need five files or four for `features/mortgage` components.
- The current tax-vector sign-off state behind take-home.
- E32's two "not re-checked in code" points remain unchecked.
- Worked examples were checked with a calculator script, not against the engine.
