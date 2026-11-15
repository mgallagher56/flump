# E33. Retirement plan: a target the user sets, tracked each month

> **Status: plan for owner approval. No code.** Written 2026-11-15 against `origin/main` at `8e08f0c8`. Not legal advice. Facts marked **[U]** were not confirmed in a primary source today.

**Summary.** The owner asked for a retirement calculator where a user works out how much retirement would cost them and tracks savings, investments and pensions against it, taking account of whether a mortgage ends or rent continues for life. This plan proposes one new page, Retirement, built on one new engine module. The user sets the target themselves, as a typed yearly figure or built from their own budget lines. Housing in retirement follows their saved housing details: a mortgage that ends, a mortgage that continues, or rent for life, each shown with the same weight. The page shows an estimated yearly income from a chosen age, in today's money, beside the user's own target, and never says what anyone "needs". Progress is a monthly series taken from the check-in. E27 stays as the tax and withdrawal slices inside this epic. Ten slices, S0 to S9; S1 to S3 give a working page.

## 1. How this relates to E27

E27 (`docs/audit/EPICS.md`) is "UK retirement and pension projection": contributions, tax relief, UFPLS and the tax-free lump sum, State Pension, inheritance tax on unused pensions from 6 April 2027, a MoneyHelper link and the self-employed saving gap. It is not started.

**Recommendation: E33 is the umbrella; E27 keeps its number and becomes slices S6 and S7 here.** Other documents already cite E27, including the E29 blocking note. E27's blockers carry over: every E33 slice that shows a projection waits for E29a, and for E29b before anyone beyond the friends beta sees it.

## 2. What exists today

| Piece | Where | Note |
| --- | --- | --- |
| Compound forecast | `packages/finance-engine/src/forecast.ts` (`calculateForecast`) | Nominal growth, default pension return 6.5%, no inflation, no retirement phase |
| State Pension rates by year | `packages/finance-engine/src/uk-tax-year.ts` (`getUkStatePensionRules`) | Weekly full new and basic rates; no State Pension age table |
| Housing facts | `packages/finance-engine/src/picture/input.ts`, `picture/selectors/housing-cost.ts` | `housingStatus` (renting, mortgage, own outright, living with family); mortgage balance, rate, term |
| Net worth choices | `packages/finance-engine/src/net-worth-basis.ts`, settings `NetWorthChoices` | Whether property and student loans count |
| Monthly series | `check-in.ts`, `snapshots.ts`; `apps/web/app/features/snapshot` | One row per account per month; carry-forward computed at read time |
| Pension page | `apps/web/app/routes/app.pension.tsx`, `features/pension/components` | Forecaster controls, chart, results; the PLSA bar was removed in E16 (decision D6) and a test asserts it stays out |
| MCP | `packages/mcp/src/tools/simulate/projectNetWorth.ts` | No retirement tool |

## 3. The advice boundary

**The rule.** Flump is not authorised. Regulated advice needs an opinion or recommendation; information is facts and figures, and evaluation or persuasion tips information into advice (FCA Handbook PERG 8.28; text read through search extracts only, **[U]** until read in full). Suggestions made to groups of people with shared characteristics are "targeted support", a regulated service since 6 April 2026 (FCA PS25/22). Flump's own rules R1 to R8 (`docs/compliance/advice-boundary-policy.md`) are stricter than both.

**What that means here.**

- The target is always the user's own. Flump never proposes one, never fills one in from age, income or housing status (R4), and never uses "need", "should", "enough", "on track", "behind" or "shortfall".
- The result is two figures and their difference, worded the same whichever is larger (R1): "Estimated income from age 67: £24,300 a year. Your target: £26,000 a year. Difference: £1,700 a year."
- A what-if never saves (R5). Every surface carries `ProjectionNotice` and, while tax vectors are unsigned, the one "Unverified estimate" notice (R6).

**How others frame it.**

| Source | What it does | What Flump takes from it |
| --- | --- | --- |
| Retirement Living Standards (Pensions UK and Loughborough University) | Three yearly cost levels. 2025 figures for one person: £13,400, £31,700, £43,900. A 2026 update is reported (**[U]**). All assume no rent or mortgage | Not shown on the page. E16 decision D6 removed the PLSA bar because it compares the user with a standard, and the housing assumption makes the figures fit renters worst. One link stays in "Assumptions and UK rules" |
| RLS licence (terms of use, read 2026-11-15) | Free. Figures and names unaltered and latest version (4.1); acknowledgement, logo and link (4.2, 4.3); personalised targets based on them must be understood as "for illustration and guidance only", and the user of the licence indemnifies the licensor (5.3); 30 days' notice to end (8.1) | Recorded in case the owner ever reverses decision RD7 |
| FCA COBS 13 Annex 2 | Authorised firms project pensions at 2%, 5% and 8% a year before charges, lower where the product warrants. Inflation assumption 2% (**[U]**, secondary source) | A dated reference for Flump's default band. Flump is not bound by it and must never say it "complies" |
| FRC AS TM1 | Sets assumptions for yearly pension statements from schemes | Reference only (**[U]**, version not confirmed) |
| MoneyHelper pension calculator and other calculators | Ask for a desired income and show an estimate against it | Wording not checked today (**[U]**). The pattern, the user states the figure, is the same |
| Pensions dashboards | Schemes had to connect by 31 October 2026. The MoneyHelper dashboard is expected to open to the public in 2027/28 with six months' notice. Running a dashboard is a regulated activity (FCA PS24/15) | Flump cannot fetch pension data. Entry stays manual, with a link out to the State Pension forecast and, when it opens, the MoneyHelper dashboard. No connection is claimed (E7) |

## 4. The model

All money is in today's prices. One real growth rate per pot type is derived from a nominal rate and an inflation rate, so the page never shows inflated future pounds.

| Part | How it works | Who sets it |
| --- | --- | --- |
| Retirement age | A saved detail. No default from the user's age; the field starts empty | User |
| Target | (a) A typed yearly figure, or (b) built from saved budget entries, each marked "continues", "stops" or "changes to £x" in retirement. Housing lines are excluded from (b) because housing is modelled on its own | User |
| Housing in retirement | From saved housing details. **Mortgage ends before the retirement age:** payments stop at the end date computed from balance, rate and term. **Mortgage continues:** payments run to that date, inside retirement. **Rent:** continues for life. **Own outright:** none. **Living with family or anything else:** the user types a monthly figure. The user can override the case, for example "I expect to rent for life" | Derived, user can override |
| State Pension | The user's own figure from the gov.uk forecast. If they give qualifying years instead: full new rate × years ÷ 35 (£241.30 a week in 2026/27). Starts at the State Pension age the user types, with a link to the gov.uk checker. The profile stores a birth year only (E23 D-3-B), which cannot give the age to the month | User; rates from the engine |
| What counts | Each account has "counts towards retirement". Defaults by account category: pensions, ISAs, investments and savings count; current accounts and property do not. Selling or downsizing a home is a what-if only | User |
| Contributions | Saved monthly pension contributions and savings, until the retirement age | Saved details |
| Growth and inflation | Three cases (lower, middle, higher) with editable rates. Defaults: 2%, 5%, 8% a year for pensions and investments, the user's saved rate for cash, 2% inflation, each labelled with its source and date | Flump default, user can change |
| Turning pots into income | Pots are spent evenly, in real terms, from the retirement age to a "plan to" age the user sets | User |
| Tax in retirement (S6) | Income tax on pension withdrawals and State Pension through the one tax engine; 25% of a pension taken tax-free up to the lump sum allowance (**[U]** figure not re-read); ISA withdrawals untaxed. Until S6, figures are before tax and say so | Engine, per person |

Rent growth is one more editable assumption, defaulting to inflation (flat in real terms). The copy never ranks the housing cases: each is a row called "Housing in retirement" with a figure and an end date or "for life".

## 5. Tracking month by month

No new table. A new selector reads the existing snapshot rows and sums the accounts that count towards retirement for each month, with carried-forward months marked as they are in History. The page draws that line against the projected path saved with the plan.

- The check-in summary (`CheckInSummary`) gains one line: "Counted towards retirement: £182,400. Changed by +£1,150 since October 2026." Same words up or down, signed as the net worth line is (E30 D6, `snapshotCopy.ts`).
- Assumptions are never recalibrated from history (E30 D10). The plan's path changes only when the user edits the plan.
- No "ahead" or "behind". The chart shows two lines and their values.

## 6. Engine design

A new folder `packages/finance-engine/src/retirement/`, exported from `index.ts`:

- `input.ts`: `RetirementPlan` (age, target, housing override, plan-to age, assumptions) and `RetirementFacts`, built from the existing picture input so there is one financial picture.
- `housing-phases.ts`: dated housing cost phases from the saved mortgage or rent, reusing `mortgage.ts` amortisation.
- `state-pension.ts`: the yearly amount from a forecast or qualifying years, starting at the age the user gave.
- `project.ts`: pots to the retirement age for each of the three cases, then yearly income for each case when the pots are spent evenly to the plan-to age.
- `target.ts`: the target from budget lines.
- `progress.ts`: the monthly counted-pots series.

There is no State Pension age table: under current law the age is 66 and some months for births from 6 April 1960 to 5 March 1961 and 67 for births from then to 5 April 1977 (**[U]**, secondary sources), and a birth year cannot place someone in those ranges.

`forecast.ts` and the Forecast page move onto the same real-terms projection in S1, so two pages cannot disagree. Withdrawal tax goes through the existing tax engine (`check-one-tax-engine` stays green). Results use the `Figure` type in `picture/figure.ts` so each carries its assumptions and provenance (`derived` or `assumption`).

## 7. Page design

A new route `apps/web/app/routes/app.retirement.tsx` and feature folder `features/retirement`. The forecaster moves off the Pension page, which keeps pension accounts and contributions.

- `<PageBody>` with one `<HeroFigure>`: "Estimated income from age 67", middle case, saved details only. Under it, in ordinary text, the user's target and the difference. With no target saved, the page shows the estimate alone and a "Set a target" action.
- `<KpiStrip>`, four items, saved data: State Pension, from pensions, from ISAs and savings, housing in retirement.
- `<SimulatorSplitLayout>`: left, a `<ScenarioZone>` driven by `useScenarioState` with `<SliderField>` for retirement age, monthly contribution, growth case and plan-to age; right, the chart (counted pots to date and the projected band) and outcome cards. The target appears only in the income outcome card, never as a pot size on the chart. No `surface.hero` on a scenario outcome.
- "Assumptions and UK rules" and the year-by-year table sit in a `<CollapsibleDrawer>`.
- One quiet notice: the standard projection notice with "Unverified estimate".
- The dashboard `PensionWidget` shows the same figure in ordinary widget text, not `<HeroFigure>`. No red, no gauge, no percentage.

## 8. MCP

- Read tool `get_retirement_picture`: the saved plan, the three-case estimate, the target, the monthly series and the assumptions, inside the existing envelope with `MCP_NOTICE` (R7). Scope `mcp:read:anonymized`.
- Simulate tool `simulate_retirement`: the same engine with overrides; saves nothing. Scope `mcp:simulate`.
- Descriptions say "estimate" and "the user's own target", and pass the MCP output policy tests. No tool returns a Retirement Living Standards level.

## 9. Test vectors

New file `packages/finance-engine/src/test-vectors/uk-retirement.vectors.ts`, under the existing sign-off (`signoff.ts`): unsigned vectors show the notice.

| Id | Case | Expected |
| --- | --- | --- |
| RV1 | Full new State Pension, 2026/27 | £241.30 × 52 = £12,547.60 a year |
| RV2 | 28 of 35 qualifying years | £193.04 a week |
| RV3 | Real growth: £50,000, 20 years, 5% nominal, 2% inflation, no contributions | £89,280 to the nearest pound |
| RV4 | Mortgage with 15 years left, retirement in 20 | Housing in retirement £0; end date before the retirement date |
| RV5 | Mortgage with 25 years left, retirement in 20 | Payments continue for 5 years of retirement, then £0 |
| RV6 | Renting, rent growth equal to inflation | Rent constant in today's money for every retirement year |
| RV7 | State Pension starts at the age the user typed | No State Pension income in any year before that age; the full yearly amount from it |
| RV8 | Target from budget: three lines, one each of continues, stops, changes | Sum of the continuing and changed amounts × 12 |
| RV9 | Counted series with one carried-forward month | Carried value flagged, never stored |
| RV10 (S6) | Withdrawal above the personal allowance with State Pension | Tax equals the tax engine's figure for the same income |

## 10. Slices

| Slice | Contents | Depends on |
| --- | --- | --- |
| S0 | Owner decisions below; E29a signed | None |
| S1 | Engine: `retirement/` modules, vectors RV1 to RV9, Forecast page on the shared projection | S0 |
| S2 | Backend and contract: saved plan on the profile, "counts towards retirement" on accounts, migration, `/v1` endpoints, export and deletion cover the new fields | S1 |
| S3 | Web page, dashboard widget, forecaster moved off Pension, stories and tests | S2 |
| S4 | Target built from budget lines | S3 |
| S5 | Monthly tracking: series, chart line, check-in summary line | S3 |
| S6 | E27: tax on withdrawals, tax-free lump sum, UFPLS, RV10 | S3; signed tax vectors |
| S7 | E27: inheritance tax on unused pensions from 6 April 2027, MoneyHelper link (needs decision RD11), self-employed view | S6; E29b wording |
| S8 | MCP tools and evals | S3 |
| S9 | Mobile parity (an E12 slice) and the two-person view (E34) | S3; E12; E34 |

S1 to S3 are useful on their own. S4, S5 and S8 can run in parallel after S3.

## 11. Strongest argument against

A long-range projection is the output most easily read as advice, and Flump has no solicitor's view yet (E29b). A user who sees "£24,300 a year" may act on it, and the figure rests on growth assumptions nobody can verify, manual balances that may be stale and tax vectors that are unsigned. The honest alternative is to keep the simpler pension forecaster and link out to MoneyHelper. The plan's answer is the three-case band, today's money, the user's own target and waiting for E29a; that reduces the risk but does not remove it.

## 12. Decisions for the owner

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| RD1 | E27 | (a) Fold in and retire the number. (b) E33 umbrella, E27 as S6 and S7. (c) Two epics | **(b)** |
| RD2 | Where the target comes from | (a) Typed only. (b) Budget only. (c) Typed first, budget-built in S4 | **(c)** |
| RD3 | Headline | (a) Estimated yearly income beside the target. (b) A percentage gauge. (c) A pot size | **(a)**; (b) judges and (c) reads as an instruction |
| RD4 | Default assumptions | (a) Editable 2%, 5%, 8% band and 2% inflation, sourced. (b) No defaults. (c) One rate | **(a)**, worded as a reference, never "compliant" |
| RD5 | "Plan to" age | (a) Empty until the user sets it. (b) Default 95, editable | **(a)**; any default is a view on how long someone lives |
| RD6 | Page | (a) New Retirement page, forecaster moves off Pension. (b) A tab on Pension | **(a)** |
| RD7 | Retirement Living Standards on the page | (a) Never; keep the one link E16 D6 left in "Assumptions and UK rules". (b) Optional reference lines, off by default, after the owner accepts the licence and its indemnity. (c) On by default | **(a)**. (b) reverses E16 D6 and UX guideline T2 |
| RD8 | Property | (a) Never counts; downsizing is a what-if. (b) Follows the net worth choice | **(a)** |
| RD9 | When | (a) After E29a, friends beta only until E29b. (b) After E29b | **(a)** |
| RD10 | State Pension age | (a) The user types it, with a link to the gov.uk checker. (b) Store a full date of birth, reopening E23 D-3-B | **(a)** |
| RD11 | MoneyHelper pension link (E27) | (a) Amend the policy's R3 exception, which today allows one named service on the debt page only, with owner-approved wording shown the same to everyone. (b) No link | **(a)** |

## Sources (all read 2026-11-15)

- FCA Handbook PERG 8.28, "Advice or information": <https://handbook.fca.org.uk/handbook/PERG/8/28.html> (search extract only).
- FCA PS25/22, targeted support, rules made 26 February 2026, in force 6 April 2026: <https://www.fca.org.uk/publications/policy-statements/ps25-22-supporting-consumers-pensions-investment-decisions>.
- FCA Handbook COBS 13 Annex 2, projections: <https://handbook.fca.org.uk/handbook/COBS/13/Annex2.html>.
- FCA PS24/15, pensions dashboard service firms, 7 November 2024: <https://www.fca.org.uk/publications/policy-statements/ps24-15-regulatory-framework-pensions-dashboard-service-firms>.
- Retirement Living Standards terms of use: <https://retirementlivingstandards.org.uk/terms-of-use>; 2025 update: <https://retirementlivingstandards.org.uk/news/2025-rls-update>.
- GOV.UK, the new State Pension, what you'll get: <https://www.gov.uk/new-state-pension/what-youll-get>.
- GOV.UK, pensions dashboards connection guidance: <https://www.gov.uk/government/publications/pensions-dashboards-guidance-on-connection-the-staged-timetable>. The 2027/28 public date is from press reports of a Pensions Dashboards Programme statement in May 2026 (**[U]**; the programme's site refused the request).
- State Pension age timetable (Pensions Act 2014): secondary sources only today (**[U]**).
