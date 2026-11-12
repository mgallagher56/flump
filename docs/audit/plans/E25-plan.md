# E25 plan: UK tax-year rules and marginal-rate what-if planner

> **Round 4 overrides** (see [DECISIONS.md round 4 and its addendum](DECISIONS.md)). Where they conflict with the text below, these win:
> - D1 (b) by feature, D2 (a) opt-in toggle, off by default, D3 (b) 'Unverified estimate' on TaxTrapCalculator now, D4 (a) session/scenario only, D5 (a) non-monetary childcare marker.
> - T8: `tax-year-verification.ts` belongs to E17-N5, with a fixed signature. T8 appends `getTaxFeatureVerification` and exports `yearVerification` from `signoff.ts`.
> - T9: drop the `copy-guard.test.ts` edit (E29-T3 owns it). T9, T10 and T11 merge after E29-T3 and add no allow-list entries; check copy against `ADVICE_PATTERNS` in unit tests.
> - T11 owns all of `TaxTrapCalculator/`, copy included, and must meet E29 R2, R5, R6 and R8 (no 'Guaranteed', no 'Escape', CTA only pre-fills). Link `docs/compliance/E29-gate.md`.
> - T15: one `check:laws` script and one baseline, shared with E23 P2-2. No new CI step.
> - Copy on every UI ticket (T9 to T14) is gated by E29a: the E29-T3 guard must be green, the owner approves the copy, and the PR links `E29-gate.md`. The engine (T1 to T8) is not gated by E29.

**Status:** plan, not started. Design and engine work with vectors still pending can start now. Every shipped figure stays behind owner sign-off of the E25 vectors (DECISIONS E4; round 3 item 13). Copy is gated by E29 and needs owner approval (DECISIONS E7). Nothing from Budget 2026 is modelled until gov.uk confirms it. 2027/28 stays with E22 (round 3 item 12).

## What exists (evidence)

**Year resolution (E22, done).** The tax-year context `getUkTaxYearContext` and the strict resolver `resolveUkTaxYear` are at `packages/finance-engine/src/uk-tax-year.ts:150-219`. Supported years are 2020/21 to 2026/27 (`types.ts:19-27`). The banner `TaxRatesStatusBanner` is at `packages/ui/src/patterns/TaxRatesStatusBanner/TaxRatesStatusBanner.tsx:20-42` but only appears on the tax page (`E22-ledger.md` follow-up 1).

**Per-year rules exist, but sources are listed per year, not per figure.**
- `getUkTaxYearRules` (`uk-tax-year.ts:344-389`) returns EWNI, Scottish, NI, employer NI, student loan, savings and dividend tables.
- `sourcesFor` (`uk-tax-year.ts:326-338`) returns the same six generic URLs for every year.
- `unverifiedFor` (`:280-324`) is free text.
- E22 follow-up 6 (a sourced rates registry) is open (`E22-ledger.md:17`). The E22 plan file that the ledger cites (sections 3.1 and 10) is not in the repo, only the ledger.

**Rules that are not versioned by year** (`uk-tax.ts:32-45`):
- `UK_TAX_CONSTANTS` holds the trap thresholds 100,000 and 125,140, ISA 20,000, pension annual allowance 60,000 for every year, the savings allowances, and 2024-onwards NI figures.
- `analyzeTaxTrap` uses these constants (`uk-tax.ts:169-176`). The trap end is therefore wrong for 2020/21: with a 12,500 personal allowance the allowance runs out at 125,000.
- The Scottish savings-allowance band is hard-coded at 50,270 (`uk-tax.ts:469`).
- `calculateNationalInsurance` has no year argument (`uk-tax.ts:328-345`).
- The trap's NI rate is read from adjusted net income, not NI pay (`uk-tax.ts:188-194`).
- `calculate100kTaxTrap` ignores its `_isSalarySacrifice` argument (`:235-245`).

**There are two take-home engines.**
- `calculateUkTax` (`uk-tax.ts:382-521`) handles regions, rounds to pence and treats every pension as net-pay, which is pinned as UNVERIFIED (`:416`, `test-vectors/uk-tax.vectors.ts:38-42`).
- `calculateUKEWNITakeHome` (`tax-rules.ts:719-812`) handles England, Wales and NI only and rounds to whole pounds (`:750,764,784`).
- Student loans take one plan only (`uk-tax-year.ts:523-532`). Plan 5 is listed from 2023/24 and is UNVERIFIED for 2023/24 to 2025/26 (`uk-tax-year.ts:313-316`).

**Not modelled anywhere:**
- The High Income Child Benefit Charge (only mentioned in the disclaimer, `tax-rules.ts:48`).
- The April 2029 £2,000 salary sacrifice NI cap.
- A marginal-rate curve or a "what if my gross changes" function.

**Vectors and sign-off.**
- 3,704 lines of vectors (`test-vectors/uk-tax.vectors.ts`), all with `signedOffBy: null`.
- The guard is `OWNER_SIGNED_IDS = []` (`uk-tax.vectors.test.ts:16`). Every year must have vectors for every kind (`:59-80`).
- `vectorSignoffHash` covers the id, year, region, kind, input, expected value and source (`signoff.ts:18-29`).
- `yearVerification` returns "verified" only when every vector for the year is signed (`signoff.ts:66-75`). It is not exported; E17 N5 plans to wrap it in `tax-year-verification.ts`.

**Who computes tax today:**
- Web:
  - `UKTaxCalculator.tsx:763-790` (via `calculateUKEWNITakeHome`)
  - `UserProfilePanel.tsx:157`, reached from `_index.tsx:180-187`
  - `PensionContainer.tsx:260-271,357`
  - `TaxTrapAlertBanner.tsx:69,86`
  - `app.onboarding.tsx:214`
  - `TaxContainer.tsx:277`
- Marketing: `InteractiveFinancialTeaser.tsx:214` (`calculateUkTax`, no year label).
- Shared tax trap calculator, `packages/ui/src/calculators/TaxTrapCalculator/TaxTrapCalculator.tsx` (marketing `ToolPage.tsx:117`, web `tools.$slug.tsx:419`):
  - hard-coded `0.62` and `0.42` (`:38`) and `"62.0%" : "42.0%"` (`:245`)
  - "UK 2026/27 Tax Engine" (`:79`)
  - "Guaranteed immediate relief" (`:266`)
  - a false childcare claim, "All funded hours revoked" (`:304-305`)
  - raw `rgba` colours and inline styles (`:65-113,291`)
  - ignores region and year (`:28`)
- MCP: `uk-tax-trap.tool.ts:72-84`, `section24.tool.ts:89`.
- Old mobile app: its own maths at `apps/mobile-companion/src/screens/ForecastScreen.tsx:11`. Not fixed, per DECISIONS (E12 rebuild).
- Region is not stored yet. It arrives with E23 P1-2, and `packages/api-contract/src/domains/profile.ts:47-48` has only the salary-sacrifice flags.
- `packages/ui` has no chart library. `ChartFigure` wraps child content; recharts is only in `apps/web`.

## Design (shared by all tickets)

**1. One core.** NEW `packages/finance-engine/src/uk-take-home.ts`, built only from the existing per-component calculators in `uk-tax-year.ts` plus the new HICBC calculator:
```ts
computeUkTakeHome(s: UkIncomeScenario, opts?: { now?: Date }): UkTakeHomeBreakdown
whatIfGrossChange(s, deltaGross): UkWhatIfResult   // before, after, deltaTakeHome, effectiveMarginalRatePct, per-component deltas
whatIfSacrificeChange(s, deltaSacrifice): UkWhatIfResult
marginalRateCurve(s, { from, to, step }): { points; thresholds: UkIncomeThreshold[] }
```
- `UkIncomeScenario` holds: `taxYear?`, `region`, `salary`, `bonus?`, `pension?` (`{ method: "salary-sacrifice" | "net-pay" | "relief-at-source"; pct | amount }`), `studentLoans?: UkStudentLoanPlanKey[]`, `childBenefit?` (`{ children; claimantIsHigherEarner }`, individual basis only), `giftAidNet?`, and `scheduledRules?: UkScheduledRuleId[]`.
- Each breakdown carries `taxYear`, `ratesYear`, `isFallback`, `assumptions[]` and `verification`.
- Deltas are computed before rounding and rounded once at the end.

**2. `calculateUkTax` becomes a thin adapter over the core** (E25-T5). Its outputs must not change; a differential test proves this. E23's `selectTakeHome`, which wraps `calculateUkTax`, then gets the single engine automatically. That is how E25 serves the E23 single source of truth without editing E23's files.

**3. Every rule has a key and a source per year.** Each `UkRuleKey` (for example `ewni.personalAllowance` or `hicbc.thresholdStart`) has, per year, `{ value, url, archiveUrl?, status: verified | unverified | provisional }`. A coverage test requires a source for every key and at least one vector touching every key.

**4. Future-dated rules** sit in a separate registry with an `effectiveFrom` date and the status "announced-provisional". They are applied only when asked for and are always labelled as an illustration. The 2029 cap is not a supported tax year.

**5. "Merged behind sign-off"** means: UI code merges, but the E25 money figures render only when `getTaxFeatureVerification(year, feature) === "verified"`. The owner's sign-off commit is the switch. Until then the surface shows a neutral "Coming soon" state, and Storybook uses fixtures. See D1 and D3.

---

## Tickets (one PR each)

### E25-T1 Sourced rules registry (claims E22 follow-up 6, without the drift workflow)

- **Goal:** give every figure, in every year, its own source URL and verification status. Move the year-less constants into the per-year rules.
- **Files:**
  - NEW `packages/finance-engine/src/uk-rule-sources.ts`: `UkRuleKey` and `UK_RULE_SOURCES`.
  - `uk-tax-year.ts:326-338` (`sourcesFor` is derived from the registry), `:280-324` (`unverifiedFor` is derived from statuses), `:344-389` (the rules gain `ruleSources`, `pensionAnnualAllowance`, `isaAllowance`, `taperEnd = taperStart + 2 × PA`).
  - `uk-tax.ts:32-45`: `UK_TAX_CONSTANTS` is deprecated and its values derived from the current year's rules.
  - `packages/finance-engine/docs/tax-sources/*.md`; `index.ts`.
  - NEW `uk-rule-sources.test.ts`.
- **Depends on:** none.
- **Conflicts and parallel safety:**
  - Conflicts with the E22 2027/28 table load (follow-up 5) and with E4 data fixes in `tax-rules.ts` and `uk-tax-year.ts`. Land T1 first, or rebase.
  - E17 N5 only reads these files, so it is safe in parallel.
  - Record in `E22-ledger.md` that E25-T1 did follow-up 6, so E22 does not repeat it.
- **Verify:**
  - Coverage test: every key in every supported year has a URL matching the existing `GOV_URL` regex (`uk-tax.vectors.test.ts:18`), a status, and a vector that touches it (a kind-to-rule-key map in the test, so the vector file is not edited).
  - The annual allowance for 2020/21 to 2022/23 is UNVERIFIED until it is read from gov.uk.
  - Section 5 commands: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build`, plus `rtk bun run check:tax-calendar`.
- **Risks:**
  - Do not touch existing vector fields: the sign-off hash covers them (`signoff.ts:18-29`).
  - Pure data and refactor: no change to computed values except the annual allowance.

### E25-T2 E25 vector catalogue, written before the engine

- **Goal:** hand-derived vectors (never computed by the engine) for each new kind:
  - `hicbc`: every year from 2020/21. The 50k/60k at 1% per £100 rule up to 2023/24 and the 60k/80k at 1% per £200 rule from 2024/25 are to be confirmed from gov.uk, as are the Child Benefit weekly rates per year.
  - `takeHome`: combined cases.
  - `whatIfDelta`: plus £1,000 at about £99.5k, £100k, £125k, £50,270, £60k and £80k.
  - `scottishMarginal`: the Scottish intermediate and higher bands below the NI upper earnings limit, and the advanced band.
  - `studentLoanMulti`: Plan 2 plus Postgrad, and Plan 5 for 2026/27.
  - `salarySacrificeCap2029`.
  - Pension method `reliefAtSource`.
  - All start UNVERIFIED with `signedOffBy: null`.
- **Files:**
  - NEW `packages/finance-engine/src/test-vectors/uk-whatif.vectors.ts`. It is separate from `uk-tax.vectors.ts`, so the 3,704-line file and its hashes are untouched.
  - `test-vectors/uk-tax.vectors.test.ts:59-80`: per-kind year coverage for the new kinds goes in a new test, not into the existing kinds list.
  - `scripts/tax-signoff.ts` and `scripts/lib/tax-signoff.ts`: sign-off accepts the new catalogue.
- **Depends on:** T1 (rule keys). The vectors can be drafted in parallel.
- **Conflicts:** E4 sign-off sessions (owner). Open decision D1.
- **Verify:** same catalogue rules as today (gov URL, derivation of more than 20 characters, unique ids, an `OWNER_SIGNED_IDS`-style guard), then the Section 5 commands.
- **Risks:**
  - Owner workload: about 60 to 90 new vectors.
  - HICBC weeks per year (52 or 53 Mondays) is a ruling item (see OWNER STEPS).

### E25-T3 HICBC calculator, individual basis only

- **Goal:** `calculateHicbc(ani, childBenefitAnnual, rules)`.
  - The percentage is floored to whole per cent per full step and capped at 100%.
  - Child Benefit per year comes from the rules (eldest and additional child, weekly, times weeks).
  - No household-basis charge.
- **Files:**
  - `tax-rules.ts`: NEW `UK_CHILD_BENEFIT` table per year.
  - `uk-tax-year.ts:344-359` (`hicbc` added to the rules).
  - NEW `uk-hicbc.ts` and `uk-hicbc.test.ts`; `index.ts`.
- **Depends on:** T1, T2.
- **Conflicts:** same files as T1; serial within the engine lane.
- **Verify:** the `hicbc` vectors pass; boundary tests at threshold ±£1 and at each £100 or £200 step; then the Section 5 commands.
- **Risk:** the stepped charge makes marginal rates at £1 resolution look like spikes. T6 handles this.

### E25-T4 Thresholds and cliffs map, plus trap fixes

- **Goal:** `getUkIncomeThresholds(rules, scenario)` returns each threshold with `{ aniAt, grossAt, kind, ruleKey, source }`:
  - band edges for EWNI and Scotland;
  - taper start and end;
  - NI primary threshold and upper earnings limit;
  - each student loan plan threshold;
  - HICBC start and end;
  - a non-monetary childcare marker (D5).

  `grossAt` is solved for the scenario's pension method. `analyzeTaxTrap` then uses it instead of the constants. Fixes:
  - `uk-tax.ts:169-176`: the 2020/21 trap ends at 125,000.
  - `uk-tax.ts:188-194`: the NI rate is read from NI pay.
  - `uk-tax.ts:237-245`: the salary sacrifice flag is honoured.
  - `uk-tax.ts:469`: Scottish savings-allowance band. Pin the current behaviour and mark it UNVERIFIED for a ruling, rather than guessing.
- **Files:** NEW `uk-tax-thresholds.ts` and test; `uk-tax.ts` at the lines above; `uk-tax.test.ts`; `uk-tax-year.property.test.ts`.
- **Depends on:** T1, T3.
- **Conflicts:**
  - E4 T15c (thresholds in the UI, web and MCP). T4 only touches the engine, so T15c can consume it.
  - E23 P0-5 is done.
- **Verify:** threshold tests per year and region; existing trap tests (the 2020/21 expectations change, so list them in the PR); then the Section 5 commands.
- **Risk:** the 2020/21 change alters live outputs for that year only.

### E25-T5 Core `computeUkTakeHome`; `calculateUkTax` becomes an adapter

- **Goal:** one core, as in design point 1. It supports:
  - pension methods salary-sacrifice, net-pay and relief-at-source. Relief at source extends the band by the grossed-up contribution, like Gift Aid (`uk-tax-year.ts:434-485`).
  - several student loan plans: one undergraduate plan plus Postgrad. Several undergraduate plans charge 9% over the lowest threshold; UNVERIFIED until ruled.
  - HICBC.
  - labelled assumptions: annual method, not pay-period; region assumed when not given (E23 D-4-C).

  `calculateUkTax` (`uk-tax.ts:382-521`) maps its input onto the core with `method: "net-pay"` (the current pinned behaviour), so its output does not change.
- **Files:** NEW `uk-take-home.ts` and test; `uk-tax.ts:382-521`; `types.ts:302-316` (optional new input fields); `index.ts`.
- **Depends on:** T3, T4.
- **Conflicts:**
  - E23 P1-4 (`selectTakeHome` wraps `calculateUkTax`): no file overlap, but agree the breakdown shape first.
  - E17 N5 and E23 P1-4 both edit the barrel; trivial rebase.
- **Verify:**
  - Differential test: `calculateUkTax` output is identical before and after, across all of `UK_TAX_VECTORS` plus a sweep of £0 to £200k in £250 steps for each region, year, plan and sacrifice flag. Run it against a snapshot taken before the refactor.
  - The T2 `takeHome` vectors pass.
  - Section 5 commands.
- **Risks:**
  - Rounding drift: compute unrounded internally and round at the boundary.
  - `calculateUKEWNITakeHome` (whole pounds) still differs. Its removal stays with E23 P2-5; E25-T15 guards against new uses.

### E25-T6 What-if and marginal-rate API, with property tests

- **Goal:** `whatIfGrossChange`, `whatIfSacrificeChange` and `marginalRateCurve`.
  - The curve gives the point rate from a £1 difference plus a smoothed rate (default £1,000 window) and lists stepped zones (HICBC) separately.
  - Labels: `asAtTaxYear` is `ratesYear`, plus `isFallback`.
- **Files:** `uk-take-home.ts` (or NEW `uk-what-if.ts`); NEW `uk-what-if.property.test.ts`, hand-written generators per E23 D-11 (no fast-check for tax).
- **Depends on:** T5.
- **Conflicts:** none outside the engine.
- **Verify:**
  - Properties:
    - `whatIf(s, d).after` equals `compute(s with gross + d)`;
    - take-home never goes down as gross rises (no monetary cliffs are modelled);
    - the effective marginal rate is between 0 and 100% outside HICBC steps;
    - inside the taper, EWNI income tax alone is 60% and Scottish 67.5%;
    - salary sacrifice never raises NI;
    - deltas are symmetric (+d then −d returns to the start).
  - The T2 `whatIfDelta` and `scottishMarginal` vectors pass.
  - Section 5 commands.
- **Risk:** performance of `marginalRateCurve` in the browser. The default of about 600 points must compute in under 50 ms; add a test budget.

### E25-T7 Future-dated rules: the April 2029 £2,000 salary sacrifice NI cap (provisional)

- **Goal:** NEW registry entry `ni.salarySacrificePensionCap2029` with `{ effectiveFrom: "2029-04-06", status: "announced-provisional", capGbp: 2000, source: <gov.uk policy paper / OOTLAR Budget 2025 URL, verified by the agent at build time> }`.
  - When requested, sacrifice above £2,000 is added back to employee and employer NI pay. Income tax relief is unchanged.
  - Student loan treatment is not yet known. The default leaves student loan earnings unchanged, labelled UNVERIFIED (accountant ruling).
  - Output is labelled "Illustration: <ratesYear> rates with the announced April 2029 cap. Not yet law; may change."
- **Files:** NEW `uk-scheduled-rules.ts` and test; `uk-take-home.ts`; `scripts/lib/tax-year-calendar.ts` only if a reminder is wanted (optional).
- **Depends on:** T5 (T6 for the delta view).
- **Conflicts:** none.
- **Verify:** the `salarySacrificeCap2029` vectors; a test that the rule is never applied implicitly; a test that the label is always present; then the Section 5 commands.
- **Risk:** the legislation changes before 2029. The rule's status and source are rechecked each release (OWNER STEPS).

### E25-T8 Verification per feature, and the gate

- **Goal:** `getTaxFeatureVerification(year, feature)`, where feature is one of `core | hicbc | whatIf | scheduled`, built on `yearVerification` (`signoff.ts:66-75`). The breakdown's `verification` field is filled from it. Adding E25 vectors therefore never un-signs a year the owner already signed (D1).
- **Files:**
  - `packages/finance-engine/src/tax-year-verification.ts`. E17 N5 creates this file (NEW there). If N5 has not landed, T8 creates it with N5's `getTaxYearVerification(year)` signature, and N5 reuses it.
  - `signoff.ts` (export the helper); `index.ts`.
- **Depends on:** T2.
- **Conflicts:** E17 N5 (same NEW file). Whichever lands second rebases; agree the signature in advance.
- **Verify:** every feature and year is "unverified" today; a fixture-signed vector flips only its own feature; then the Section 5 commands.
- **Risk:** the vectors are bundled into the browser build (N5 notes the same risk). They are data only; check the marketing bundle size in the PR.

### E25-T9 UI patterns: `MarginalRateChart`, `TakeHomeDeltaPanel`, tax guidance copy

- **Goal:**
  - NEW `packages/ui/src/patterns/MarginalRateChart/`: a hand-written SVG step chart inside `ChartFigure`, with no new dependency, so the marketing bundle stays light. It uses `chart.primary`, `chart.warning`, `chart.band`, `chart.grid` and `chart.baseline`. Threshold markers have accessible labels, and the data table goes in a `CollapsibleDrawer` when it has more than 8 rows.
  - NEW `packages/ui/src/patterns/TakeHomeDeltaPanel/`: shows the delta, the keep rate and a component breakdown table with at most 8 rows, an "As at tax year 2026/27" `StatusBadge`, `TaxRatesStatusBanner` when `isFallback` is true, `ProjectionNotice`, and the gated state.
  - NEW `packages/ui/src/patterns/TaxGuidanceCopy/` (or a `copy.ts` inside the panel): every string in one place, guidance-only wording.
- **Files:** the three NEW directories (5 files each); `packages/ui/src/index.tsx`; `apps/web/app/copy-guard.test.ts` (extended to scan `packages/ui/src/{patterns,calculators}` for "you should", "guaranteed" and "recommend").
- **Depends on:** T6 (types only; fixtures can be used before then).
- **Conflicts:** E15 phases 0 to 2 in `packages/ui` (tokens and components); new directories only, so low risk. Use the E15 `Money` and `KpiCard` primitives.
- **Verify:**
  - Stories in light and dark with zero a11y violations.
  - `play()` tests for the threshold tooltip and the gated state.
  - Vitest tests for the "as at" label, the fallback banner and tabular numbers.
  - `rtk bun run check:laws`, then the Section 5 commands.
- **AGENTS.md laws:** 1 (5 files each), 2 (semantic tokens, tabular-nums, en-GB formatting), 3 (drawer when more than 8 rows), 4.
- **Risks:** E29 copy approval; chart accessibility.

### E25-T10 NEW calculator `PayRiseTakeHomeCalculator`

- **Goal:** a signed-out calculator covering a pay rise, bonus or extra sacrifice.
  - Layout: `SimulatorSplitLayout`. The left 5 columns hold `SliderField`s: gross, change, pension method and amount, region, student loan plans, children and higher-earner flag, and the 2029 toggle. The right 7 columns hold a `KpiStrip` with at most 4 items (delta take-home, keep rate, marginal rate, tax year), `MarginalRateChart` and `TakeHomeDeltaPanel`.
  - The figures are gated by T8.
- **Files:** NEW `packages/ui/src/calculators/PayRiseTakeHomeCalculator/` (5 files); `packages/ui/src/calculators/index.ts`; `packages/ui/src/tokens/architecture.laws.test.ts` already covers `calculators/`.
- **Depends on:** T6, T7, T8, T9.
- **Conflicts:** E15 (`packages/ui` calculators); new directory only.
- **Verify:** the same as T9, plus a `play()` test that moving the slider changes the delta and that the delta equals `whatIfGrossChange` for a fixture.
- **AGENTS.md laws:** 1, 2, 3 (`SimulatorSplitLayout`, `SliderField`, `KpiStrip`), 4.
- **Risks:** too many inputs on mobile. Put student loans, children and the 2029 toggle under an "More details" disclosure.

### E25-T11 Rebuild `TaxTrapCalculator` on the engine

- **Goal:**
  - Remove the hard-coded rates and copy: `:38` (0.62/0.42), `:245` ("62.0%"/"42.0%"), `:79` (year label, now read from the year context), `:266` ("Guaranteed"), `:304-305` (childcare, per D5).
  - Use `whatIfSacrificeChange` and the rates the engine names. Add a region input.
  - Replace inline styles and `rgba` (`:65-113,291`) with recipes.
  - Use `SimulatorSplitLayout` and `SliderField` instead of the paired raw number input and range (`:131-162,194-226`).
  - Gate the figures per D3.
- **Files:** `packages/ui/src/calculators/TaxTrapCalculator/*` (all 5 files).
- **Depends on:** T6, T9.
- **Conflicts:**
  - E15 if it restyles calculators: coordinate one owner per file.
  - E23 table 2.2 lists this file for `selectTrap`; T11 does that work, so tell E23 it is done.
- **Verify:** existing tests updated; no `0\.62|62\.0%|rgba\(` in the directory; stories in light and dark; then `check:laws` and the Section 5 commands.
- **AGENTS.md laws:** 1, 2, 3.
- **Risks:** a live tool changes visibly. The owner approves the copy (E7).

### E25-T12 Marketing wiring

- **Goal:**
  - Add a tool page for `PayRiseTakeHomeCalculator`: new slug in `apps/marketing/src/pages/ToolPage.tsx:115-175` and an entry in `ToolsIndexPage.tsx:94`.
  - Add an "As at tax year" label and a gate to `InteractiveFinancialTeaser.tsx:214`.
  - Keep the claims in `apps/marketing/src/claims.test.ts` in step.
- **Files:** those three files and their tests and stories. Per law 1, a new page section gets its own directory.
- **Depends on:** T10, T11.
- **Conflicts:** E7 marketing copy (owner sign-off); E16 D7-B (marketing owns tool pages).
- **Verify:** `ToolPage.test.tsx` renders the slug; `claims.test.ts`; stories; then the Section 5 commands.
- **Risk:** search pages that go live before sign-off would show "Coming soon". Do not deploy the slug until the gate opens, or accept a neutral placeholder.

### E25-T13 Signed-in planner on the tax hub and pension page

- **Goal:**
  - `TakeHomeDeltaPanel` and `MarginalRateChart` go into the Tax hub (F42) in `apps/web/app/containers/tax/TaxContainer.tsx`, and into the pension page sacrifice section, replacing the `PensionContainer.tsx:260-271,357` maths.
  - Inputs come from E23's financial picture facts, with overrides held client-side (E23 2.1). Until P1-7 lands, inputs come from the profile, with labelled assumptions (region assumed).
- **Files:** `TaxContainer.tsx`, `PensionContainer.tsx`. Any new components go under `apps/web/app/features/tax/components/*` (4 files per the law 1 relaxation for feature components).
- **Depends on:** T9, T10, T8; E23 P1-4 (preferred P1-7 and P1-10).
- **Conflicts:**
  - E23 P1-10 migrates the same containers: run T13 as part of P1-10, or straight after it.
  - E15 page migration of these screens.
  - E22 follow-up 1 (banner coverage): T13 adds the banner here, so record that in the ledger.
- **Verify:** consistency harness (E23 P1-14) `data-figure="takeHome.delta"`; tests on 5 and 6 April with fake timers; then the Section 5 commands.
- **AGENTS.md laws:** 1, 2, 3 (`SimulatorSplitLayout` on the pension and tax simulators), 4.
- **Risk:** large shared files. Keep the diff small; no restyle.

### E25-T14 Home page marginal-rate widget

- **Goal:** `TaxWidget` (`apps/web/app/components/dashboard/widgets/TaxWidget.tsx`) shows "Marginal rate now: X% (as at 2026/27)", how far the user is from the next threshold, and a link to the T13 planner. It reads `takeHome` and `marginalRate` from the picture; nothing is computed locally.
- **Files:** `TaxWidget.tsx` and its test and story; `apps/web/app/routes/_index.tsx:180-187` (stop calling `calculateNetTakeHome`, per E23 P1-9).
- **Depends on:** T6, T8; E23 P1-9; the E15 dashboard widget set (round 2 conflict 1, round 3 item 3).
- **Conflicts:** E15 dashboard (it goes last) and E16 D11-B layout. This ticket waits until E15 signals the widget set is fixed.
- **Verify:** widget test with the gated and fallback states; story in light and dark; then the Section 5 commands.
- **AGENTS.md laws:** 2, 3 (`KpiStrip` if shown as a KPI), 4.
- **Risk:** blocked longest; acceptable.

### E25-T15 One-engine guard

- **Goal:** a `check:laws` ratchet that fails when apps, `packages/ui` or `packages/mcp` import `calculateUKEWNITakeHome`, `calculateNationalInsurance` or `UK_TAX_CONSTANTS`, or use the literals `0.62`, `62%` or `125140`. The baseline is the current sites listed above; it may only shrink.
- **Files:** NEW `scripts/check-one-tax-engine.ts` and test; `package.json:31` (`check:laws`).
- **Depends on:** T5.
- **Conflicts:** E23 P2-2 / E4 T17 `check-no-local-finance-math` (same intent). Fold T15's patterns into that script if it has landed; otherwise P2-2 absorbs T15 later.
- **Verify:** a fixture-based test like `check-design-laws.test.ts`; then the Section 5 commands.

**Handoff (not E25 tickets):**
- E17 N12 (`get_tax_year_position`, `simulate_salary_sacrifice_and_gift_aid`) calls `computeUkTakeHome`, `whatIf*` and `getTaxFeatureVerification`. E26 builds on N12.
- E12 mobile M4 onwards consumes the same exports; the old app is not fixed.
- E21 needs no new endpoint: what-if is computed on the client from the picture facts (E23 2.1).

---

## OWNER STEPS (agents never do these)

1. **Sign the E25 vectors** with `bun run tax:signoff`, following the round 3 item 13 passes:
   - Pass 1: check the parameters (Child Benefit weekly rates, HICBC thresholds, annual allowance by year, Plan 2/5 thresholds) against gov.uk.
   - Pass 2: cross-check the `takeHome` and `whatIfDelta` vectors in two independent calculators.
   - Pass 3: your own P60s.
   - Order: 2024/25 to 2026/27 first, then 2020/21 to 2023/24.
2. **Add these to the paid accountant hour:**
   - the pension method default (net-pay pinned for everyone today);
   - relief-at-source band extension for Scottish taxpayers;
   - several undergraduate student loan plans at once;
   - HICBC weeks per year (52 or 53);
   - student loans under the 2029 cap;
   - the Scottish savings-allowance band (`uk-tax.ts:469`).

   Record each ruling as a `rulingRef`.
3. **Recheck the 2029 cap's status** on gov.uk before each release that shows it; keep it provisional until Royal Assent.
4. **Approve copy** for T9 to T14 (E7, plus the E29 gate once it exists).
5. **Leave Budget 2026 out.** Load 2027/28 only through the E22 checklist (`docs/runbooks/tax-2027-28-verification-checklist.md`). E25 picks it up with no code change.

## OPEN DECISIONS (few)

- **D1. Verification scope.** Options: (a) by year, where any unsigned vector un-signs the whole year; (b) by feature within a year. **Recommend (b):** otherwise adding E25 vectors would undo the friends-beta sign-off of 2024/25 to 2026/27 (DECISIONS round 3 item 9). *Straightforward.*
- **D2. How to show the 2029 cap.** Options: (a) an opt-in toggle that applies it to the latest year's rates, labelled as an illustration; (b) a text note only; (c) wait for a 2029/30 table. **Recommend (a), off by default.** *Straightforward*, given the label. The student loan treatment is an accountant ruling, not this decision.
- **D3. The live `TaxTrapCalculator` while the gate is closed.** Options: (a) gate it too, which removes a live tool; (b) engine figures with an "unverified estimate" label now (as E17 D4-B does for MCP), gating new surfaces only. **Recommend (b):** it replaces wrong hard-coded figures with engine ones. *Straightforward.*
- **D4. Storing the HICBC and pension-method inputs.** Options: (a) session or scenario only in v1; (b) new nullable profile columns after E23 P1-2 (plus E21 contract and E19 privacy notice). **Recommend (a)** for less personal data and no migration; revisit when E26 needs them. *Straightforward.*
- **D5. The childcare £100k cliff.** Options: (a) a non-monetary marker from gov.uk: Tax-Free Childcare and the extended hours end above £100k adjusted net income per parent; the universal hours are not income-tested; (b) drop it. **Recommend (a)**, with the false "All funded hours revoked" claim removed in T11. *Straightforward.*

## Lane summary

| Lane | Tickets (order) | Parallel with | Blocked by |
|---|---|---|---|
| **E: engine** (`packages/finance-engine`) | T1 → T2 → T3 → T4 → T5 → T6 → T7; T8 after T2 | U on fixtures; E17 N5 (agree T8 signature) | none for code; figures need owner sign-off |
| **U: ui** (`packages/ui`) | T9 → T10, T11 | E (types first), E15 phases 0 to 2 (new directories only) | T6 for real data; E29 and owner copy approval |
| **M: marketing** | T12 | W | T10, T11; gate opens on sign-off |
| **W: web** | T13 → T14 | M | E23 P1-4/P1-9/P1-10; E15 dashboard widget set (T14) |
| **G: guard** | T15 | all | T5; merge with E23 P2-2 if it exists |

The critical path to the first shipped figure is T1 → T2 → T3 → T4 → T5 → T6 → T8 → T9 → T10 → T12, plus owner sign-off of the E25 vectors for 2024/25 to 2026/27.

