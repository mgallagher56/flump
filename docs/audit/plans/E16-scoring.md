# E16 scoring (phase 1)

Rubric from the plan section 3 (V user value, F frequency, D differentiation, T trust, DD data availability, C completeness, M maintenance, R risk, E effort; each 1 to 5). Value = (3V+2F+2D)/7, Health = (2T+DD+C)/4, Cost = (M+R+E)/3. Scores are one reviewer's judgment from code and a browser walkthrough; they are not usage data (N=1, no analytics). Calibration against a second scorer was not run; the independent review is described at the bottom.

Bucket rules used: `foundation` rows (onboarding, accounts) are MOST VALUABLE by exception because everything depends on them. Dead, unreachable or claim-only is NO VALUE. Value ≥ 4 with D ≥ 3 is MOST VALUABLE (F13 and F33 score V4 but Value below 4, so they sit in NICE-TO-HAVE; the ADD rows are listed separately). A duplicate or slop flag, or Value < 3 with Cost < 3, is BLOAT-SLOP. Otherwise Value ≤ 2 is NO VALUE and the rest is NICE-TO-HAVE. Rows not yet built are listed as ADD (proposed).

The **Populated** column records what changes when the app holds a heavy dataset (17 accounts, £118k income, mortgage, BTL, overdraft, four tax years, 22 budget entries): **better** = more valuable with real data, **breaks** = value falls or figures go wrong, **same** = unchanged or not exercised. Notes are in each row's evidence below; screenshots are named *--heavy--* in e16-screenshots/.

## Bucket summary

| Bucket | Count | Rows |
|---|---|---|
| MOST VALUABLE | 8 | F01, F02, F03, F04, F05, F07, F11, F31 |
| NICE-TO-HAVE | 15 | F06, F08, F10, F12, F13, F14, F15, F20, F24, F25, F32, F33, F35, F36, F39 |
| BLOAT-SLOP | 9 | F09, F17, F18, F19, F21, F22, F23, F26, F34 |
| NO VALUE | 10 | F16, F27, F28, F29, F30, F37, F38, F43, F44, F45 |
| ADD (proposed) | 3 | F40, F41, F42 |

## Gates

- **F16 Budget 'actuals' (MTD settled)**: T=1: hide or fix
- **F27 Bank OAuth and open-banking providers**: T=1: hide or fix
- **F30 Plaid and sandbox bank adapters**: T=1: hide or fix
- **F31 MCP AI access (token card + server)**: T=1: hide or fix
- **F37 Country selector (15 countries), Irish take-home**: T=1: hide or fix
- **F40 Account deletion and data export**: R=1: owner/legal review
- **F43 Childcare as a standalone calculator**: T=1: hide or fix

## Scores and placement

| ID | Feature | V | F | D | T | DD | C | M | R | E | Value | Health | Cost | Bucket | Action | Populated |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F01 | Onboarding baseline (3 steps) | 4 | 2 | 3 | 2 | 4 | 1 | 2 | 4 | 3 | 3.14 | 2.25 | 3 | MOST VALUABLE | fix | same |
| F02 | Home dashboard KPIs and safe-to-spend | 4 | 5 | 3 | 2 | 4 | 3 | 2 | 4 | 3 | 4 | 2.75 | 3 | MOST VALUABLE | fix | breaks |
| F03 | Accounts and net worth (manual) | 4 | 4 | 2 | 4 | 3 | 3 | 3 | 4 | 3 | 3.43 | 3.5 | 3.33 | MOST VALUABLE | keep | better |
| F04 | Monthly balance check-in drawer | 4 | 5 | 3 | 3 | 3 | 2 | 4 | 5 | 4 | 4 | 2.75 | 4.33 | MOST VALUABLE | fix | breaks |
| F05 | £100k trap, salary sacrifice, employer NI | 5 | 3 | 5 | 2 | 3 | 3 | 2 | 3 | 3 | 4.43 | 2.5 | 2.67 | MOST VALUABLE | fix | better |
| F06 | UK take-home calculator (Forecast tab) | 4 | 3 | 2 | 3 | 4 | 3 | 3 | 4 | 4 | 3.14 | 3.25 | 3.67 | NICE-TO-HAVE | merge | same |
| F07 | Debt payoff (avalanche vs snowball) | 5 | 4 | 3 | 4 | 2 | 4 | 3 | 3 | 4 | 4.14 | 3.5 | 3.33 | MOST VALUABLE | keep | better |
| F08 | UK debt instruments (0% cliff, overdraft, car balloon, student loan) | 3 | 2 | 4 | 4 | 2 | 3 | 2 | 3 | 4 | 3 | 3.25 | 3 | NICE-TO-HAVE | keep | better |
| F09 | Debt-to-wealth bridge card | 2 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 4 | 2 | 2.75 | 3.33 | BLOAT-SLOP | merge | same |
| F10 | Mortgage tracker, LTV milestones | 3 | 3 | 3 | 2 | 2 | 3 | 1 | 3 | 2 | 3 | 2.25 | 2 | NICE-TO-HAVE | fix | breaks |
| F11 | Overpay vs invest decision (3 implementations) | 5 | 3 | 4 | 2 | 3 | 3 | 2 | 3 | 3 | 4.14 | 2.5 | 2.67 | MOST VALUABLE | merge | breaks |
| F12 | Remortgage shock simulator | 3 | 2 | 3 | 2 | 2 | 3 | 3 | 4 | 3 | 2.71 | 2.25 | 3.33 | NICE-TO-HAVE | demote | breaks |
| F13 | Pension pots and forecaster | 4 | 3 | 3 | 2 | 3 | 4 | 1 | 3 | 3 | 3.43 | 2.75 | 2.33 | NICE-TO-HAVE | keep | better |
| F14 | Savings pots, AER, ISA allowance pill | 3 | 3 | 2 | 2 | 4 | 4 | 2 | 4 | 4 | 2.71 | 3 | 3.33 | NICE-TO-HAVE | keep | better |
| F15 | Budget plan (categories, surplus) | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 5 | 3 | 2.71 | 3 | 3.33 | NICE-TO-HAVE | keep | breaks |
| F16 | Budget 'actuals' (MTD settled) | 1 | 1 | 1 | 1 | 1 | 1 | 3 | 4 | 4 | 1 | 1 | 3.67 | NO VALUE | cut | same |
| F17 | Budget setup wizard | 2 | 1 | 1 | 3 | 4 | 4 | 2 | 5 | 4 | 1.43 | 3.5 | 3.67 | BLOAT-SLOP | merge | same |
| F18 | Runway calculator | 3 | 2 | 2 | 2 | 3 | 3 | 1 | 4 | 4 | 2.43 | 2.5 | 3 | BLOAT-SLOP | demote | same |
| F19 | Self Assessment ledger (tax records) | 3 | 2 | 3 | 3 | 2 | 3 | 1 | 2 | 2 | 2.71 | 2.75 | 1.67 | BLOAT-SLOP | demote | breaks |
| F20 | Section 24 landlord tax | 3 | 2 | 5 | 4 | 3 | 4 | 4 | 4 | 5 | 3.29 | 3.75 | 4.33 | NICE-TO-HAVE | keep | same |
| F21 | Forecast route (as its own page) | 2 | 2 | 1 | 2 | 4 | 3 | 3 | 4 | 4 | 1.71 | 2.75 | 3.67 | BLOAT-SLOP | merge | breaks |
| F22 | Financial stage hero and health score | 2 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 4 | 2.29 | 2.5 | 3.33 | BLOAT-SLOP | fix | breaks |
| F23 | Dashboard customisation (order, sizes, per-widget config) | 2 | 2 | 1 | 4 | 5 | 4 | 2 | 5 | 4 | 1.71 | 4.25 | 3.67 | BLOAT-SLOP | demote | better |
| F24 | Dashboard module widgets (8) | 3 | 4 | 2 | 2 | 4 | 3 | 2 | 4 | 3 | 3 | 2.75 | 3 | NICE-TO-HAVE | demote | same |
| F25 | Setup checklist | 3 | 2 | 2 | 4 | 4 | 3 | 3 | 5 | 4 | 2.43 | 3.75 | 4 | NICE-TO-HAVE | keep | same |
| F26 | Bank connect via personal token (Monzo, Starling, Trading212) | 2 | 3 | 2 | 3 | 2 | 3 | 2 | 2 | 3 | 2.29 | 2.75 | 2.33 | BLOAT-SLOP | demote | same |
| F27 | Bank OAuth and open-banking providers | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 3 | 1 | 1 | 2.33 | NO VALUE | cut | same |
| F28 | Synced transactions (stored, never shown on web) | 1 | 1 | 1 | 3 | 1 | 1 | 3 | 2 | 3 | 1 | 2 | 2.67 | NO VALUE | cut | same |
| F29 | Account history editing | 2 | 2 | 1 | 3 | 2 | 1 | 3 | 4 | 3 | 1.71 | 2.25 | 3.33 | NO VALUE | cut | same |
| F30 | Plaid and sandbox bank adapters | 1 | 1 | 1 | 1 | 1 | 1 | 3 | 3 | 5 | 1 | 1 | 3.67 | NO VALUE | cut | same |
| F31 | MCP AI access (token card + server) | 4 | 3 | 5 | 1 | 3 | 1 | 3 | 2 | 3 | 4 | 1.5 | 2.67 | MOST VALUABLE | fix | same |
| F32 | Offline AI context pack (copy, .md, .json) | 3 | 2 | 4 | 3 | 3 | 4 | 4 | 4 | 5 | 3 | 3.25 | 4.33 | NICE-TO-HAVE | keep | better |
| F33 | Public tools (7 calculators) | 4 | 3 | 4 | 3 | 5 | 4 | 4 | 4 | 4 | 3.71 | 3.75 | 4 | NICE-TO-HAVE | keep | same |
| F34 | Web signed-out home (duplicate of marketing) | 1 | 1 | 1 | 2 | 5 | 4 | 1 | 3 | 4 | 1 | 3.25 | 2.67 | BLOAT-SLOP | cut | same |
| F35 | Marketing site | 3 | 2 | 2 | 4 | 5 | 4 | 3 | 4 | 4 | 2.43 | 4.25 | 3.67 | NICE-TO-HAVE | keep | same |
| F36 | Demo sandbox | 3 | 1 | 2 | 3 | 5 | 4 | 3 | 5 | 4 | 2.14 | 3.75 | 4 | NICE-TO-HAVE | keep | same |
| F37 | Country selector (15 countries), Irish take-home | 1 | 1 | 1 | 1 | 4 | 2 | 3 | 3 | 4 | 1 | 2 | 3.33 | NO VALUE | cut | same |
| F38 | Spanish locale / i18n layer | 1 | 1 | 1 | 3 | 4 | 1 | 3 | 5 | 5 | 1 | 2.75 | 4.33 | NO VALUE | cut | same |
| F39 | Profile and settings (password, danger zone) | 3 | 2 | 1 | 4 | 4 | 4 | 2 | 3 | 4 | 2.14 | 4 | 3 | NICE-TO-HAVE | keep | same |
| F40 | Account deletion and data export | 3 | 1 | 1 | 3 | 5 | 1 | 3 | 1 | 3 | 1.86 | 3 | 2.33 | ADD (proposed) | add | same |
| F41 | CSV import (statements, history) | 4 | 4 | 3 | 3 | 3 | 1 | 3 | 3 | 3 | 3.71 | 2.5 | 3 | ADD (proposed) | add | same |
| F42 | Tax-year hub (take-home, trap, sacrifice, SA, deadline) | 5 | 3 | 5 | 3 | 3 | 1 | 3 | 3 | 2 | 4.43 | 2.5 | 2.67 | ADD (proposed) | add | same |
| F43 | Childcare as a standalone calculator | 1 | 1 | 1 | 1 | 1 | 1 | 3 | 3 | 3 | 1 | 1 | 3 | NO VALUE | cut | same |
| F44 | Dead components (~2,500 LOC excluding the two law-compliant ones): scenario bar and store, ScenarioLayersWidget, WealthCheckHeroWidget, SavingsQuickStartWizard, PromoCliffTracker, FLPSlider, FLPSpinner, FLPTable, useDebtPayoffSchedule, AccountDetailsStyles, barrels | 1 | 1 | 1 | 3 | 1 | 1 | 2 | 5 | 5 | 1 | 2 | 4 | NO VALUE | cut | same |
| F45 | Law-compliant dead components (PayoffStrategyControls, SandboxTemplates) | 2 | 1 | 1 | 4 | 1 | 2 | 4 | 5 | 4 | 1.43 | 2.75 | 4.33 | NO VALUE | merge | same |

## Evidence and recommendation per row

### MOST VALUABLE

**F01 Onboarding baseline (3 steps)** (partial, Value 3.14, Health 2.25, Cost 3) → **fix**
- Evidence (first-run): Observed twice (dev server, then a production build, both on a fresh database at origin/main e4ff6c3, which equals this worktree's HEAD): Finish shows 'We couldn't save your details'. Exact calls: POST /accounts with {name,type,balance,isCurrent} returns 500 (null value in column currency; the DTO field is optional but nothing defaults it, account-intake.service.ts:97) and POST /budget-entries with {title,category,amount,isIncome,frequency} returns 500 (null value in column name; the controller reads body.name, budget.controller.ts:277). Reproduced with curl using the same payloads (app.onboarding.tsx:339-356). Age, student loan plan, housing status and costs are collected but dropped by the profile PATCH (no user_profiles columns); cash and pension pot are seeded as accounts and housing as budget entries, so those survive. No region input. Live take-home appears after 2 fields (good).
- Populated (same): First-run only. The Finish bug also blocks reaching the populated state, so populated runs needed API seeding.
- Recommendation: Fix first. Make Finish succeed, persist region, age and student-loan plan, cut to at most 6 required inputs.

**F02 Home dashboard KPIs and safe-to-spend** (partial, Value 4, Health 2.75, Cost 3) → **fix**
- Evidence (first-run): Observed: net worth £16,000, surplus £482, safe-to-spend £111/week render. After raising salary to £112k the 'Monthly take-home' stayed £2,382 (stale budget income) while the Forecast widget said £5,916/mo. Safe-to-spend uses an invented 60/40 living split (HomeDashboard.tsx:104). Not using KpiStrip.
- Populated (breaks): Heavy data (£118k, 17 accounts): net worth -£210,070 (no property asset type, so the mortgage counts and the home does not); surplus -£88 although £900/mo is saved; safe-to-spend £0 on Home vs £774/week on Budget; take-home £7,950 vs £5,984 (forecast widget) vs £6,350 (profile). Layout holds. See home--heavy--1280--light.png.
- Recommendation: Fix: derive take-home from one source, drop invented split, adopt KpiStrip.

**F03 Accounts and net worth (manual)** (real, Value 3.43, Health 3.5, Cost 3.33) → **keep**
- Evidence (first-run): Observed: list renders, net worth consistent across Home and Accounts. Everything else depends on it. Hydration failure was dev-server only: in a production build the page is interactive. But every account edit goes through PATCH /accounts/:id, which returns 404 on the backend (stacked @Put/@Patch leave only PUT registered, finance.controller.ts:130-131), so edits in Accounts, Pension, Debt and the mortgage rate all fail.
- Populated (better): 17 accounts group by type, overdrawn current shows -£640. But the overdraft is not in the debt total, and there is no property asset. Interactive in a production build (the dev-server hydration failure is dev-only), but edits 404.
- Recommendation: Keep as foundation. Verify hydration in a production build.

**F04 Monthly balance check-in drawer** (partial, Value 4, Health 2.75, Cost 4.33) → **fix**
- Evidence (first-run): Production build: the drawer opens. Saving fails: it posts to the route action, which PATCHes /accounts/:id and that returns 404 on the backend (PUT works). Code: handleSaveAll calls fetcher.submit N times on one fetcher (:50-62) so only the last account may save; success shown after 1.2s regardless. No history row is written, so no trend.
- Populated (breaks): With 17 balances the drawer means 17 edits on one fetcher. In a production build the drawer opens but the save path 404s (PATCH /accounts/:id). Snapshot monthlyHistory stayed empty, so month two shows no trend.
- Recommendation: Fix and promote. This is the only monthly habit loop; make it write history and show 'net worth up £N'.

**F05 £100k trap, salary sacrifice, employer NI** (partial, Value 4.43, Health 2.5, Cost 2.67) → **fix**
- Evidence (first-run): Observed for £112k: Pension page says 60% marginal, £106,400 adjusted income, £3,840 extra tax; Forecast says 62%, allowance lost £6,000, saves £7,440 on £12k. Same question, different answers on two pages. The Pension banner hard-codes '60%' in JSX while Forecast uses the engine's NI-inclusive rate (reviewer-confirmed). England rates only; no region.
- Populated (better): Valuable with real data: Pension banner computes £108,560 adjusted income, SIPP £8,560, £5,136 reclaimed. But Forecast says £9,000 allowance lost at 62%, the tool says £5,000 of £9,000 reclaimed, and Pension double counts contributions (13% profile + £1,480 per-pot).
- Recommendation: Fix first (E4 vectors), one engine call, one surface, persist region and student loan.

**F07 Debt payoff (avalanche vs snowball)** (real, Value 4.14, Health 3.5, Cost 3.33) → **keep**
- Evidence (first-run): Observed: honest empty state ('No debts yet', Add debt CTA). Cleanest engine use. Fabricated debts removed (dbdb9b7). Missing from mobile drawer and bottom bar.
- Populated (better): Strongest populated page: 5 debts, avalanche £9,091 vs snowball £9,365 vs minimum £10,796, 0% card tracker, bridge. But the Plan 2 student loan (income-contingent) is treated as a payable debt with an 'estimated minimum' of £785/mo, inflating the debt budget to £1,505/mo and the total to £58,150; the -£640 overdraft is missing from it.
- Recommendation: Keep and promote; add to mobile nav; advice-boundary wording review.

**F11 Overpay vs invest decision (3 implementations)** (partial, Value 4.14, Health 2.5, Cost 2.67) → **merge**
- Evidence (first-run): Observed on the public tool: £240k, 4.5%, £350/mo, 7% gives 'Save £36,349' vs ISA pot £183,388. The tool imports no engine code. Page, tool and MCP can disagree.
- Populated (breaks): Needs the term, which is not stored, so the page simulators stay empty until re-entered every visit.
- Recommendation: Merge to one engine function behind page, tool and MCP, prefilled from the user's data.

**F31 MCP AI access (token card + server)** (mock, Value 4, Health 1.5, Cost 2.67) → **fix**
- Evidence (first-run): Observed: card now says 'preview' but 'Create Token' mints flump_pat_ from Math.random() in the browser (McpConnectionCard.tsx:108-114). It shows 'Active Tokens (1)' while GET /mcp-tokens returns []. Journey fails at the token step. Server tools are real; MCP guardrail resource is stale for 2026/27 and one tool invents 72% take-home.
- Populated (same): No change observed or not exercised.
- Recommendation: Fix behind a preview flag after E1, or hide the card. T=1 gate: do not leave the fake minting visible.

### NICE-TO-HAVE

**F06 UK take-home calculator (Forecast tab)** (real, Value 3.14, Health 3.25, Cost 3.67) → **merge**
- Evidence (first-run): Engine-backed. User re-picks student loan by hand; EWNI only. Competes with free salary calculators; only differentiated when prefilled.
- Populated (same): Forecast take-home £5,984/mo ignores rental and side income and the student loan.
- Recommendation: Merge into the Tax hub with prefill from profile.

**F08 UK debt instruments (0% cliff, overdraft, car balloon, student loan)** (real, Value 3, Health 3.25, Cost 3) → **keep**
- Evidence (first-run): Engine-backed; niche but differentiated. Overlaps the public tools and student-loan MCP tool.
- Populated (better): 0% expiry tracker shows 'Window active (304 days left)' with a £300/mo target.
- Recommendation: Keep inside Debt; dedupe against the public tools.

**F10 Mortgage tracker, LTV milestones** (partial, Value 3, Health 2.25, Cost 2) → **fix**
- Evidence (first-run): Observed: empty-state shows 'Remaining Balance £0, Interest Rate 0%, Remaining Term 0 years' for a user with no mortgage. 3,331 LOC with five independent amortisation copies.
- Populated (breaks): With a real mortgage account the page still shows Remaining Term 0 years, Monthly Payment £0 and 'Add your mortgage term'. Term is labelled 'Not saved — enter each visit' and Save returned 'Could not save your mortgage details' because its rate update PATCHes /accounts/:id, which 404s. Horizontal scroll at 375px.
- Recommendation: Fix empty state; move maths to the engine.

**F12 Remortgage shock simulator** (real, Value 2.71, Health 2.25, Cost 3.33) → **demote**
- Evidence (first-run): Seasonal value; local payment formula.
- Populated (breaks): Same missing-term dependency.
- Recommendation: Keep inside Mortgage; engine maths.

**F13 Pension pots and forecaster** (real, Value 3.43, Health 2.75, Cost 2.33) → **keep**
- Evidence (first-run): Observed: pot £12,000, 5%+3% contribution, tax relief shown. Defaults employer 3% never asked. 4,035 LOC; local compounding and a hard-coded qualifying-earnings constant.
- Populated (better): 3 pots, £201,500, trap banner active. Contributions double counted (13% from profile plus £1,480 per-pot monthly = £2,758/mo).
- Recommendation: Keep; move maths to the engine; fold QuickStartWizard into empty state.

**F14 Savings pots, AER, ISA allowance pill** (real, Value 2.71, Health 3, Cost 3.33) → **keep**
- Evidence (first-run): Observed: balance £4,000; weighted AER 0.00%, 10-year growth £4,000. SavingsForecasterCard is NOT shared with Forecast: two implementations.
- Populated (better): £105,600 across 5 accounts, 10-year growth £255,608. The 2.01% weighted AER averages investments in at 0%.
- Recommendation: Keep; absorb the Forecast savings tab; engine maths.

**F15 Budget plan (categories, surplus)** (partial, Value 2.71, Health 3, Cost 3.33) → **keep**
- Evidence (first-run): Observed: income £2,382, expenses £1,900, safe-to-spend £231/week. Differs from Home's £111/week (different formula). No month dimension.
- Populated (breaks): 22 entries: 'Monthly deficit -£88, spending exceeds income' because the £900 savings line is counted as spending; 'Expenses £7,138 across 4 categories' omits it. Safe-to-spend £774/week vs £0 on Home.
- Recommendation: Keep plan-only; align safe-to-spend with Home.

**F20 Section 24 landlord tax** (real, Value 3.29, Health 3.75, Cost 4.33) → **keep**
- Evidence (first-run): Engine-backed public tool and MCP tool. Niche but a real differentiator for landlords.
- Populated (same): Rental net £28,238 shown in the SA ledger.
- Recommendation: Keep as a tool and inside the Tax module.

**F24 Dashboard module widgets (8)** (partial, Value 3, Health 2.75, Cost 3) → **demote**
- Evidence (first-run): Observed: eight cards, each links to its page. Three carry their own compounding.
- Populated (same): Eight cards, 1,505px at 1280, workable; figures inherit the inconsistencies above.
- Recommendation: Reduce to the core four; engine maths.

**F25 Setup checklist** (real, Value 2.43, Health 3.75, Cost 4) → **keep**
- Evidence (first-run): Observed '4 / 5' progress card on Home. Dismissal is per browser.
- Populated (same): No change observed or not exercised.
- Recommendation: Keep; unify with onboarding.

**F32 Offline AI context pack (copy, .md, .json)** (real, Value 3, Health 3.25, Cost 4.33) → **keep**
- Evidence (first-run): Visible on the MCP tab, works without a token. The safest first AI step.
- Populated (better): Context pack becomes more useful when populated; not exported in this run.
- Recommendation: Keep; lead with it until tokens work.

**F33 Public tools (7 calculators)** (real, Value 3.71, Health 3.75, Cost 4) → **keep**
- Evidence (first-run): Observed: trap tool opens prefilled and shows output with 0 inputs (115k, £10k sacrifice). Not linked from the signed-in shell. No region selector. Mortgage tool CTA claims 'syncs your live balance and monitors fixed-rate renewal dates automatically' (no such feature).
- Populated (same): Tool at £118k: 62%, £5,000 of £9,000 reclaimed. Not prefilled from the profile.
- Recommendation: Keep as the acquisition front door; fix the mortgage tool and CTA copy; add region.

**F35 Marketing site** (real, Value 2.43, Health 4.25, Cost 3.67) → **keep**
- Evidence (first-run): E7 removed false claims; claims.test.ts guards regressions.
- Populated (same): No change observed or not exercised.
- Recommendation: Keep as sole public home.

**F36 Demo sandbox** (mock, Value 2.14, Health 3.75, Cost 4) → **keep**
- Evidence (first-run): ?demo=true and /app/sandbox now redirect to /sandbox: the two-demo problem is already resolved. Signed-in users are bounced.
- Populated (same): No change observed or not exercised.
- Recommendation: Keep; trim fixtures.

**F39 Profile and settings (password, danger zone)** (partial, Value 2.14, Health 4, Cost 3) → **keep**
- Evidence (first-run): No account (identity) deletion and no data export (UK GDPR exposure); data can be wiped via Reset Financial Data.
- Populated (same): No change observed or not exercised.
- Recommendation: Keep; split the panel; see F40.

### BLOAT-SLOP

**F09 Debt-to-wealth bridge card** (real, Value 2, Health 2.75, Cost 3.33) → **merge**
- Evidence (first-run): Narrative overlap with the payoff outcome. No test or story.
- Populated (same): Bridge shows +£105,529 five years after debt-free; still redundant with the payoff outcome.
- Recommendation: Merge into the payoff outcome panel.

**F17 Budget setup wizard** (real, Value 1.43, Health 3.5, Cost 3.67) → **merge**
- Evidence (first-run): Overlaps onboarding steps 2 and 3.
- Populated (same): No change observed or not exercised.
- Recommendation: Merge into onboarding and the empty state.

**F18 Runway calculator** (partial, Value 2.43, Health 2.5, Cost 3) → **demote**
- Evidence (first-run): 1,397 LOC for a low-frequency job; settings lost across devices; overlaps safe-to-spend and the stage hero.
- Populated (same): Runway 1 yr 7.6 mos on Home; works.
- Recommendation: Demote to one emergency-fund-months card in Budget.

**F19 Self Assessment ledger (tax records)** (real, Value 2.71, Health 2.75, Cost 1.67) → **demote**
- Evidence (first-run): Observed: renders with zero state (£0.00). Largest file in the app. Receipts stored as base64. Per-record and per-year delete exist, plus Reset Financial Data; there is no data export (R=2).
- Populated (breaks): Annual records recur every year, so four years of salary stack to +£446,714 in 2026/27 and the Home widget shows est. tax due £146,466 on +£541,266 income. Page KPI says SA due £0.00 and gross £38,000 (stale browser baseline from an earlier £38k session: the unscoped localStorage key). The year selector 2023/24 to 2026/27 exists.
- Recommendation: Demote to opt-in module (default on for self-employed or rental income).

**F21 Forecast route (as its own page)** (real, Value 1.71, Health 2.75, Cost 3.67) → **merge**
- Evidence (first-run): Observed: shows 'CURRENT MONTHLY SAVINGS £250/mo' and 'HYPOTHETICAL £375/mo' that nobody entered, while Savings says £0/mo. Composed of components that exist elsewhere; engine calculateForecast has no live web consumer (MCP life-events tool uses it).
- Populated (breaks): Still shows 'Current monthly savings £250/mo' for a user saving £900/mo (Home says +£812/mo).
- Recommendation: Merge into Savings, Pension and a Tax hub; redirect /app/forecast.

**F22 Financial stage hero and health score** (partial, Value 2.29, Health 2.5, Cost 3.33) → **fix**
- Evidence (first-run): Decorative unless inputs are real; defaults inflate it. Health score is MCP-only.
- Populated (breaks): 'Stage 1: Stabilize and clear' for a £118k earner with £105,600 liquid, driven by the inflated £58,150 debt figure.
- Recommendation: Hide until inputs are real, or cut.

**F23 Dashboard customisation (order, sizes, per-widget config)** (real, Value 1.71, Health 4.25, Cost 3.67) → **demote**
- Evidence (first-run): Seven config surfaces for a product with one real user.
- Populated (better): Customisation matters more with eight populated modules; show/hide would cover it.
- Recommendation: Show or hide only.

**F26 Bank connect via personal token (Monzo, Starling, Trading212)** (partial, Value 2.29, Health 2.75, Cost 2.33) → **demote**
- Evidence (first-run): Real providers, but most UK users cannot create a token. Read-only. Implies AISP exposure (R=2).
- Populated (same): No change observed or not exercised.
- Recommendation: Demote to Advanced/beta.

**F34 Web signed-out home (duplicate of marketing)** (real, Value 1, Health 3.25, Cost 2.67) → **cut**
- Evidence (first-run): Duplicates seven marketing components; hard-coded metrics ('£1,480 & 16 months'); not covered by marketing claims test. With dev bypass, / goes straight to onboarding so I could not render it.
- Populated (same): No change observed or not exercised.
- Recommendation: Cut; send signed-out / to marketing.

### NO VALUE

**F16 Budget 'actuals' (MTD settled)** (dead, Value 1, Health 1, Cost 3.67) → **cut**
- Evidence (first-run): Gated on actualMtdGbp != null, but no code path writes it. Cannot show.
- Populated (same): Still 'Actual spending is not tracked yet'.
- Recommendation: Remove until CSV import exists.

**F27 Bank OAuth and open-banking providers** (dead, Value 1, Health 1, Cost 2.33) → **cut**
- Evidence (first-run): Web fallback return URL is /auth/callback, a copy of the WorkOS handler (differs from /callback by one line, the function name). The backend OAuth path redirects to ${BACKEND_URL}/bank-connections/callback, which has no route. Either way no working bank callback exists.
- Populated (same): No change observed or not exercised.
- Recommendation: Flag off and delete (E6).

**F28 Synced transactions (stored, never shown on web)** (dead, Value 1, Health 2, Cost 2.67) → **cut**
- Evidence (first-run): Web has no consumer for GET/POST /transactions; only mobile reads it and the MCP transactions tool. Stores sensitive rows nobody sees.
- Populated (same): No change observed or not exercised.
- Recommendation: Decide: show on account detail, or stop storing.

**F29 Account history editing** (stub, Value 1.71, Health 2.25, Cost 3.33) → **cut**
- Evidence (first-run): Three actions call POST/PUT/DELETE routes the backend does not have (404).
- Populated (same): Not exercised.
- Recommendation: Remove the edit UI; history comes from the check-in.

**F30 Plaid and sandbox bank adapters** (mock, Value 1, Health 1, Cost 3.67) → **cut**
- Evidence (first-run): Unwired mocks.
- Populated (same): No change observed or not exercised.
- Recommendation: Delete.

**F37 Country selector (15 countries), Irish take-home** (partial, Value 1, Health 2, Cost 3.33) → **cut**
- Evidence (first-run): Observed: selector lists United Kingdom, United States, Germany, France, Ireland and more. Thirteen countries return untaxed gross as take-home (T=1). EUR switches the formatter to de-DE against the en-GB law.
- Populated (same): No change observed or not exercised.
- Recommendation: Cut. Force GB/GBP; keep columns.

**F38 Spanish locale / i18n layer** (stub, Value 1, Health 2.75, Cost 4.33) → **cut**
- Evidence (first-run): es has 19 keys vs 55 in en, no language switcher, home namespace empty.
- Populated (same): No change observed or not exercised.
- Recommendation: Cut, or leave dormant (owner decision D6).

**F43 Childcare as a standalone calculator** (claim-only, Value 1, Health 1, Cost 3) → **cut**
- Evidence (first-run): Only copy. The trap tool states 'All funded hours revoked' without computing eligibility.
- Populated (same): No change observed or not exercised.
- Recommendation: Fold into trap copy or build a real check later.

**F44 Dead components (~2,500 LOC excluding the two law-compliant ones): scenario bar and store, ScenarioLayersWidget, WealthCheckHeroWidget, SavingsQuickStartWizard, PromoCliffTracker, FLPSlider, FLPSpinner, FLPTable, useDebtPayoffSchedule, AccountDetailsStyles, barrels** (dead, Value 1, Health 2, Cost 4) → **cut**
- Evidence (first-run): Zero non-test importers (grep). Each still has a test, inflating counts.
- Populated (same): No change observed or not exercised.
- Recommendation: Cut.

**F45 Law-compliant dead components (PayoffStrategyControls, SandboxTemplates)** (dead, Value 1.43, Health 2.75, Cost 4.33) → **merge**
- Evidence (first-run): The only web code using the layout-law primitives. Correction: PromoCliffTracker does NOT use them. No live page complies with AGENTS.md section 3.
- Populated (same): No change observed or not exercised.
- Recommendation: Adopt on Debt (D10-B) instead of deleting.

### ADD (proposed)

**F40 Account deletion and data export** (not built, Value 1.86, Health 3, Cost 2.33) → **add**
- Evidence (first-run): R=1 until built: records, receipts and balances can be deleted piecemeal or via Reset Financial Data, but there is no account deletion and no data export. Not optional.
- Populated (same): No change observed or not exercised.
- Recommendation: Add (hygiene). Needs owner and legal review.

**F41 CSV import (statements, history)** (not built, Value 3.71, Health 2.5, Cost 3) → **add**
- Evidence (first-run): Parser is tested and unwired. Unlocks actuals and history.
- Populated (same): No change observed or not exercised.
- Recommendation: Add as top-3 candidate.

**F42 Tax-year hub (take-home, trap, sacrifice, SA, deadline)** (not built, Value 4.43, Health 2.5, Cost 2.67) → **add**
- Evidence (first-run): Trap appears on five surfaces; take-home on Forecast; SA on Tax. User cannot find 'what should I do before 5 April'.
- Populated (same): No change observed or not exercised.
- Recommendation: Add as top-3: one hub, fed by persisted region and student loan.


## Section 6 hypothesis table: validated or overturned

| Plan row | Hypothesis | Finding | Verdict | Rows | Note |
|---|---|---|---|---|---|
| £100k trap, sacrifice, employer NI | MOST VALUABLE / fix | MOST VALUABLE (value 4.4), fix first | **Validated** | F05 | Two pages disagree (60% vs 62%); no region. |
| UK take-home calculator | MOST VALUABLE / merge into Tax | NICE-TO-HAVE / merge | **Overturned** | F06 | D=2 alone; only differentiated when prefilled. |
| Debt payoff and 0% cliff | MOST VALUABLE for P6, T-gated | MOST VALUABLE (4.1), keep | **Validated, T gate lifted** | F07,F08 | Fabricated debts gone (dbdb9b7); engine-backed. Instruments card is NICE. |
| Mortgage overpay vs invest | MOST VALUABLE / merge three | MOST VALUABLE / merge | **Validated** | F11 | Confirmed three implementations; public tool not engine-backed. |
| Accounts and net worth | MOST VALUABLE foundation | Foundation / keep | **Validated** | F03 |  |
| Home KPIs and safe-to-spend | MOST VALUABLE if honest | MOST VALUABLE / fix | **Validated** | F02 | Stale take-home and invented 60/40 split. |
| Onboarding | MOST VALUABLE activation | Foundation / fix | **Validated, worse than expected** | F01 | Finish returns a 500 on main. |
| Pension pots and forecaster | NICE / keep | NICE / keep | **Validated** | F13 | Local maths confirmed (4,035 LOC). |
| Savings pots | NICE / merge forecaster dup | NICE / keep, absorb Forecast tab | **Partly overturned** | F14 | SavingsForecasterCard is NOT shared with Forecast; two copies. |
| Budget plan | NICE / plan-only | NICE / keep | **Validated** | F15 | Actuals gated but unreachable (F16). |
| Self Assessment ledger | NICE for P4, BLOAT otherwise | BLOAT-SLOP / demote | **Validated (as BLOAT for most users)** | F19 | Value 2.7, cost 1.7. |
| Section 24 | NICE (P4) | NICE / keep | **Validated** | F20 |  |
| MCP AI access | MOST VALUABLE if real, NO VALUE now | MOST VALUABLE (potential) / fix, T gate | **Validated** | F31 | Fake token still minted client-side. |
| Public tools (7) | MOST VALUABLE for acquisition | NICE (3.7), acquisition front door | **Partly overturned** | F33 | Rubric measures user value; mortgage tool not engine-backed. |
| Forecast as own route | BLOAT (duplicate) | BLOAT / merge | **Validated** | F21 | Also shows invented £250/£375 savings. |
| Runway calculator | BLOAT-SLOP | BLOAT / demote | **Validated** | F18 |  |
| Stage hero and health score | NICE or BLOAT | BLOAT / fix or hide | **Validated (BLOAT)** | F22 | Health score has no web consumer. |
| Remortgage shock sim | NICE | NICE / demote | **Validated** | F12 |  |
| UK debt instruments card | NICE | NICE / keep | **Validated** | F08 |  |
| DebtToWealthBridgeCard | BLOAT candidate | BLOAT / merge | **Validated** | F09 |  |
| Dashboard customisation | BLOAT-SLOP | BLOAT / demote | **Validated** | F23 |  |
| BudgetSetupWizard, PensionQuickStartWizard | NICE / merge | BLOAT (dup) / merge (Budget); NICE keep (Pension) | **Partly overturned** | F17,F13 | Pension wizard is live and useful in the empty state. |
| Bank connect via PAT | NICE (beta) | BLOAT / demote to Advanced | **Overturned** | F26 | Value 2.3, cost 2.3; AISP exposure. |
| Bank OAuth, open-banking | NO VALUE | NO VALUE / cut | **Validated** | F27 | Mechanism found: return URL hits the WorkOS callback. |
| Synced transactions | NO VALUE | NO VALUE / decide | **Validated** | F28 | Mobile and MCP read them; web does not. |
| CSV import | ADD | ADD (value 3.7) | **Validated** | F41 | Parser real, unwired. |
| Account deletion and export | Add (compliance) | Add; R=1 | **Validated** | F40 |  |
| Country selector, Irish take-home, es | NO VALUE / cut | NO VALUE / cut | **Validated** | F37,F38 | 13 of 15 countries get untaxed take-home. |
| Two demos | BLOAT | Already resolved | **Overturned (done)** | F36 | ?demo=true redirects to /sandbox. |
| Two public homes | BLOAT / cut web one | BLOAT / cut | **Validated** | F34 |  |
| Dead components | NO VALUE / cut | NO VALUE / cut, adopt two | **Validated, list extended** | F44,F45 | Five more dead files; PromoCliffTracker does not use layout primitives. |
| Plaid and sandbox adapters | NO VALUE | NO VALUE / delete | **Validated** | F30 |  |
| Pro plan, trial, auto-categorisation claims | NO VALUE (claim) | Removed by E7 | **Done** | F35 | Web home still carries hard-coded metrics. |
| Childcare calculator | Claim-only | NO VALUE as standalone | **Validated** | F43 |  |

Tally: validated 27, partly overturned 3, overturned 3, done/resolved 1.
