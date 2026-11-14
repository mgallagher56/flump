# E16 polish plan: every page to 10/10 on visual quality and simplicity

Status: plan, written 2026-11-14 against `origin/main` 7b9b6425. Evidence: the E16 polish audit (cross-cutting problems A1 to A16, design system B, per-page table C) and the screenshots in `docs/design/e16-polish/before/` (not committed). This plan does not re-report the 19 defects in `docs/design/e15/prerelease/REPORT.md`; a fix PR for those is in flight, and where a PR here touches the same file it says "after the pre-release fix PR merges".

## 1. Summary

What is wrong:

- **Too many numbers and no single answer.** Pages carry 20 to 41 figures (pension 41, savings 26, take-home 24). Each stacks a hero, a 4-card KPI strip with captions, cards that restate the strip, and a scenario zone with its own result cards. The figure that answers the page's question is often not the headline (pension, budget, debt).
- **The same figure repeats.** Net worth shows three times on the dashboard and again on accounts and history. ISA allowance, the housing cost card, months of cover and the "next £1,000" explorer each live on two or three pages.
- **Notices and "Not set" are louder than the content.** The indigo guidance banner sits above the h1 on six surfaces and again inside every scenario zone, and takes a quarter of the first screen at 375. "Not set" renders bigger than real values (12 on the mortgage page).
- **Light mode is two colours, and the system leaks.** Sand plus teal, cards that barely lift, one identical hero band per page. Underneath: four tab styles, about 39 font sizes outside the scale, 25 or more hard-coded transitions, about 105 legacy `FLP*` usages, `Skeleton` used nowhere, three hero treatments.
- **Some screens are simply wrong.** A homeowner's net worth is -£69,000 because the property is not counted; LTV says "not available" when both inputs exist; take-home changes between onboarding steps; signed-out copy promises bank feeds that do not exist.

Shape of the fix:

1. Set checkable rules (section 3): a number budget, one headline figure and one hero per page, one quiet notice per surface, one tabs component, a figure ownership table, whole pounds, plain words.
2. Fix the design system first (PR 1 and PR 2) so pages get the rules by adopting components, and enforce them in `check:laws` and a shared page-rules test helper.
3. Fix the data gaps in parallel (PR 3), because no page with a wrong headline can score 10.
4. Rework pages in six parallel PRs grouped by domain, then the calculators, tool pages and marketing.
5. Re-run the screenshot sweep into `docs/design/e16-polish/after/` and re-score (PR 13).

Twelve build PRs plus one verification PR. Sixteen owner decisions are listed in section 7; eleven can proceed on the recommendation by default.

## 2. Scorecard

Scores are out of 10 and provisional. Nothing is a 10 today. "Target" is the score the named PR must reach in the PR 13 re-score; a page only counts as 10 when the re-score says so. Two scores were adjusted from the audit, with reasons: dashboard visual is split by persona (the homeowner sees a red negative hero, so 5.5), and self assessment simplicity for a PAYE-only user is lowered to 3 (an all-zero page with 40 buttons answers nothing).

| Page                     | Visual now          | Simplicity now    | Target, PR                                      | Why it is not a 10 today                                                                                                                                                   | Dark and 375 notes                                                                   |
| ------------------------ | ------------------- | ----------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Dashboard `/app`         | 6.5 (5.5 homeowner) | 4                 | 10 / 10, PR 4 (needs PR 3)                      | Net worth three times; banner and debt card above the hero; KPI strip repeats the hero; checklist and check-in between KPIs and cards; five cards with 4 to 7 figures each | Dark +0.5. 375: header, banner, h1, subtitle fill the first screen before any figure |
| Accounts                 | 6.5                 | 5.5               | 10 / 10, PR 5                                   | Totals stated three ways (strip, bars, list); one table per type for one row; ISA card with 7 figures; empty bank block for an unavailable feature                         | Dark +0.5                                                                            |
| Net worth history        | 7.5                 | 8                 | 10 / 10, PR 5                                   | Chart drawn for one month; indigo note; odd gutters; short hero                                                                                                            | Dark +0.5                                                                            |
| Budget                   | 6                   | 5                 | 10 / 10, PR 5                                   | Hero is weekly safe to spend, not "left over"; housing form above the hero; 8-item pill nav; split shown three times                                                       | 375: gutters 12px, banner first                                                      |
| Debt (with debts)        | 5.5                 | 4.5               | 10 / 10, PR 6                                   | "Not set" louder than figures; jargon; scenario zone holds two tools, a banner and a warning                                                                               | Dark +0.5                                                                            |
| Debt (empty)             | 8.5                 | 9                 | 10 / 10, PR 6                                   | Tab bar shown with nothing to tab                                                                                                                                          | Same                                                                                 |
| Mortgage                 | 4.5                 | 3.5               | 10 / 10, PR 6 (needs PR 3)                      | 12 "Not set"; three empty states; hero is a KPI cell; LTV wrongly unavailable                                                                                              | Dark +0.5                                                                            |
| Pension                  | 6                   | 3                 | 10 / 10, PR 7                                   | 41 figures; the answer is a small card in the scenario zone; captions with 2 figures each; chips duplicate a slider                                                        | 375: 4,017px tall                                                                    |
| Savings                  | 6                   | 4                 | 10 / 10, PR 7                                   | Three of four KPIs are £0; sliders outside the scenario zone; flat-line chart; milestones to £1,000,000                                                                    | 375: banner first                                                                    |
| Take-home                | 7                   | 5.5               | 10 / 10, PR 8                                   | Pence; legend and table duplicate; saved breakdown sits inside the scenario zone                                                                                           | Dark +0.5                                                                            |
| Self assessment          | 5.5                 | 3.5 (3 PAYE-only) | 10 / 10 for opted-in users, PR 8                | £0 hero to PAYE-only users; 40 buttons; "Unverified estimate" three times                                                                                                  | 375: 5,240px tall                                                                    |
| Settings                 | 7                   | 7.5               | 10 / 10, PR 9                                   | Hero wasted on an email; native selects; "Optional modules"                                                                                                                | Same                                                                                 |
| Onboarding               | 6.5                 | 7                 | 10 / 10, PR 9 (needs PR 3)                      | Full app nav during setup; "Skip" beside "Next" on a required step; figure changes between steps                                                                           | 375 fine                                                                             |
| Sandbox                  | 6.5                 | 4                 | 10 / 10, PR 4                                   | Inherits the dashboard; four notices; false bank-feed line                                                                                                                 | Indigo slab in dark                                                                  |
| Web `/tools` index       | 7                   | 7.5               | 10 / 10, PR 11                                  | Duplicate of the marketing index with different copy; banner above h1                                                                                                      | 375 header overflow is known #3                                                      |
| Web tool pages (7)       | 5.5                 | 5.5               | 10 / 10, PR 10 then PR 11                       | Old calculator style; positive results in red and orange; false CTA claim; four items before the tool                                                                      | Same                                                                                 |
| Error, 404               | 8                   | 9                 | 10 / 10, PR 9                                   | Stripped header with no way to the rest of the site                                                                                                                        | Same                                                                                 |
| Marketing home           | 7                   | 6                 | 9.5 / 10, PR 12 (10 needs copy sign-off)        | 9 sections, 6,650px; off-system colours; developer sections for a household reader                                                                                         | 375: 10,470px tall; purple glow in dark                                              |
| Marketing `/tools`       | 7.5                 | 8                 | 10 / 10, PR 11                                  | Cards have no fill; dollar icons; orphan row                                                                                                                               | Same                                                                                 |
| Marketing tool pages (8) | 6                   | 6                 | 10 / 10, PR 10 then PR 11                       | Seven old calculators; "Liability 1"; pay-rise tool has four notices                                                                                                       | 375 snowball overflow is known #10                                                   |
| Marketing pricing        | 6                   | 5                 | 9 / 9, PR 12 (10 only when a price exists, D10) | Half the page is a plan that does not exist                                                                                                                                | Same                                                                                 |
| Marketing security       | 7                   | 8                 | 10 / 10, PR 12                                  | Two cards repeat the intro; placeholder email in body copy                                                                                                                 | Same                                                                                 |
| Marketing MCP            | 6.5                 | 5                 | 9.5 / 9.5, PR 12                                | 4,450px; developer styling; wrong primary CTA                                                                                                                              | 375: 7,900px                                                                         |
| Marketing contact        | 7                   | 7.5               | 10 / 10, PR 12                                  | Six cards, three are the same email                                                                                                                                        | Same                                                                                 |
| Design system            | 7                   | 6                 | 10 / 10, PR 1, PR 2, PR 13                      | Sound structure, poor adoption: two component layers, type leak, faint cards, indigo notes, four tab styles, messy Storybook                                               | Dark is the stronger theme                                                           |

### Counts, question and figure per page

N1 is distinct figures in the first view at 1280 by 800; N is the whole page before any disclosure is opened. Targets come from the budget in section 3.

| Page                          | The one question                               | The one figure                                      | N1 / N now            | Cards, CTAs, headings now | N1 / N target                     |
| ----------------------------- | ---------------------------------------------- | --------------------------------------------------- | --------------------- | ------------------------- | --------------------------------- |
| Dashboard                     | Where do I stand this month?                   | Net worth (D1)                                      | 7 / 20 to 30          | 13, 13, 12                | 4 / 10                            |
| Accounts                      | What do I own and owe?                         | Net worth, as the list total                        | 5 / 14 to 17          | 11, 7, 11                 | 3 / 3 plus one per account row    |
| History                       | How has my net worth changed?                  | Change since last month                             | 4 / 9                 | 3, 3, 3                   | 2 / 6                             |
| Budget                        | What is left after my bills?                   | Left over each month                                | 5 / 10 to 16          | 12, 16, 8                 | 4 / 4 plus one per category row   |
| Debt                          | When will I be debt-free?                      | Debt-free date (D2)                                 | 5 / 20                | 10, 9, 9                  | 4 / 10                            |
| Mortgage                      | What do I pay and when is it paid off?         | Monthly payment, with the finish date beside it     | 3 / 4 (+12 "Not set") | 14, 10, 11                | 4 / 9, at most 1 "Not set" prompt |
| Pension                       | What might I have to live on when I retire?    | Estimated monthly income at retirement (D2)         | 13 / 41               | 14, 12, 6                 | 4 / 12                            |
| Savings                       | How much have I saved and where is it heading? | Total savings                                       | 4 / 26                | 16, 5, 7                  | 3 / 10                            |
| Take-home                     | What do I take home each month?                | Monthly take-home                                   | 8 / 24                | 10, 4, 8                  | 4 / 9                             |
| Self assessment               | How much should I set aside for my tax bill?   | Estimated bill                                      | 2 / 24                | 12, 40, 5                 | 3 / 10, at most 6 buttons in view |
| Settings                      | Are my details right?                          | None                                                | 0 / 0                 | 5, 8, 5                   | 0 / 0, 1 primary CTA              |
| Onboarding                    | What do I need to tell Flump?                  | Monthly take-home (one figure, stable across steps) | 3 / 3 to 15           | 1 to 7, 2 to 3, 2 to 8    | 1 / 6 on review                   |
| Sandbox                       | What would Flump show me?                      | As dashboard                                        | 7 / 25                | 12, 9, 9                  | 4 / 10, 2 notices                 |
| Web and marketing tools index | Which calculator do I need?                    | None                                                | 0 to 1 / 3 to 9       | 7 to 8, 7 to 8, 8 to 9    | 0 / 0                             |
| Tool pages                    | One per tool                                   | One result per tool                                 | 1 to 9 / 1 to 19      | 2 to 8, 1 to 7, 2 to 9    | 3 / 8                             |
| Marketing home                | What is Flump and is it for me?                | None (preview shows 3)                              | 3 / 17                | 20+, 12, 16               | 3 / 6, 5 sections                 |
| Pricing                       | What does it cost?                             | Free                                                | 2 / 3                 | 2, 3, 3                   | 1 / 2                             |

## 3. Target principles (acceptance criteria)

Each rule has an id. PR acceptance criteria cite them. "Figure" means a distinct money amount, percentage, duration or date shown as data; a user's own list rows (accounts, debts, budget categories, tax records) count one per row and are governed by P1.4, not the page total.

### P1. Number budget (Miller's law, one focal point per view)

1. **First view, 1280 by 800:** at most 4 figures: the headline plus at most 3 supporting.
2. **First view, 375 by 667:** the h1 and the headline figure are both visible without scrolling. Nothing but the app header sits above the h1.
3. **Whole page before disclosure:** at most 12 figures, excluding list rows.
4. **Lists:** one figure per row (the balance or amount). Second figures (rate, change, limit) go in the row's detail view. Lists over 8 rows collapse (existing law).
5. **`KpiStrip`:** 3 cards by default, 4 at most (existing law). No card repeats the headline. A caption is optional, one line, and contains no figure. At most one card in a strip carries a delta badge.
6. **Captions and helper text:** at most 1 figure per sentence, and no sentence that only restates a figure shown beside it.
7. **`ScenarioZone`:** one tool visible at a time, at most 3 tools; at most 3 inputs visible (the rest behind "More options"); one outcome figure plus at most 2 supporting figures; one chart.
8. **Dashboard cards:** one figure, one line of text, one link each.

### P2. One headline, one hero

1. Each page has one headline figure, the one in the table above. It is the largest text on the page after the h1.
2. `surface.hero` appears at most once per page, on the headline, as the `HeroFigure` block (section 4.5). No hero cell inside a KPI strip, no hero on settings, onboarding, tools or a scenario outcome (existing law).
3. If the headline value is unknown, the hero is not drawn; the page shows one setup prompt instead (P3).
4. A headline that is an estimate carries the word "Estimate" in its label and sits directly above the page's notice (see D2 for whether an estimate may take the hero).

### P3. "Not set" and zero

1. "Not set" renders in `numeric.unset`: body size, `text.muted`, regular weight, never larger or heavier than a real value, always with one action link ("Add your rate").
2. If half or more of a strip or card's values are unknown, the strip or card is replaced by one `EmptyState` prompt naming everything missing ("Add your interest rate and term to see your payment breakdown"). One prompt per page, not one per card.
3. A zero that exists only because an input is missing is "Not set", not `£0` (D16). A KPI card whose real value is zero and carries no information (interest earned £0 with no savings rate) is hidden.
4. At most 1 "Not set" in the first view and 3 on the whole page.

### P4. One notice per surface, quiet style

1. One `ProjectionNotice` per page (R6), wording unchanged from `PROJECTION_NOTICE_TEXT`. It sits at the foot of the first region that shows a projection: inside the `ScenarioZone` footer when the page has one, otherwise directly under the chart or figure it qualifies. Never above the h1, never in the first 400px at 375.
2. Style: the `note` variant (section 4.4): `text.secondary` on the surrounding surface, small info icon, top hairline, no fill, no indigo. Always visible without interaction (not inside a collapsed drawer).
3. Tax pages show "Unverified estimate" once per page: a neutral `StatusBadge` beside the headline, with the full sentence in the page's single notice.
4. Sandbox and sample data: the `SandboxBar` is the one sample-data notice; plus the one `ProjectionNotice`. Two in total.
5. `status.info` is for information the user must act on. Disclaimers never use it.

### P5. One tabs component (Hick's law)

1. In-page view switching uses `Tabs` from `@repo/ui` only (section 4.5), at most 4 tabs. No `FLPTabs`, no container-local underline tabs, no pill nav, no button-pair toggles.
2. Tabs are hidden when there is one option or the page is empty.

### P6. Figure ownership

A figure is the headline on one page only. Other pages may show it once, outside a hero, with a link to the owner.

| Figure                              | Owner page                          | Allowed elsewhere                                                    |
| ----------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Net worth                           | Dashboard (hero)                    | Accounts: once, as the list total. History: as the chart's end label |
| Change in net worth                 | History                             | Dashboard hero sub-line (one delta)                                  |
| Left over each month, safe to spend | Budget                              | Dashboard: one KPI                                                   |
| Months of cover                     | Budget                              | Dashboard: one KPI. Removed from history                             |
| Housing cost                        | Mortgage (owners), Budget (renters) | Not both for the same user                                           |
| ISA allowance used                  | Savings                             | Accounts: none (link)                                                |
| Monthly take-home                   | Take-home                           | Budget: as the income line. Onboarding review                        |
| Marginal rate, "next £1,000"        | Take-home                           | Self assessment: link only                                           |
| Pension pot, contributions          | Pension                             | Dashboard card: pot only                                             |
| Debt total, debt-free date          | Debt                                | Dashboard card: one of the two                                       |

Within a page, a figure appears once. A chart may plot it, but the legend, table and caption do not print it again in the default view.

### P7. Copy

1. Plain words. Banned in user-facing strings, with replacements:

| Banned                                                                | Use                                             |
| --------------------------------------------------------------------- | ----------------------------------------------- |
| module(s), widget(s)                                                  | section(s), or name the thing                   |
| baseline, "refine and drill down"                                     | your figures; "Finish setting up"               |
| snapshot (as a noun for the dashboard)                                | picture                                         |
| liability, liabilities, "Active liability accounts", "Liability 1"    | debt(s), "what you owe", "Your debts", "Debt 1" |
| assets                                                                | "what you own"                                  |
| Creditor                                                              | Lender                                          |
| Qualifying gross                                                      | Pay that counts for your pension                |
| Weighted by balance (AER)                                             | Average rate                                    |
| Discretionary allowance                                               | Flexible spending                               |
| Liquid cash                                                           | Cash you can get at quickly                     |
| Synced bank connections, balance feeds, credentials                   | Connected banks                                 |
| engine, mathematically, guaranteed, optimal, "psychological momentum" | remove; state the figure                        |
| "high APR" as a label                                                 | state the rate: "24.9% APR"                     |
| live, syncs, monitors, "bank feeds and HMRC data" (signed-out)        | remove until true                               |

2. No judgement (owner rule): no red, flame icons or warning badges for ordinary situations (having debt, a negative net worth, renting, not reaching a milestone). Negative amounts use `text.primary` with a minus sign. `status.danger` is for errors and destructive actions only.
3. UK English, sentence case headings, no em dashes, no uppercase eyebrows.
4. One primary button per page, named for what it does on that page's state ("Edit budget" when a budget exists, not "Create budget").
5. The £100,000 threshold is never a banner or headline. It is one factual line inside the "next £1,000" tool, and only when income is in the band (R8 wording: "Below £100,000").

### P8. Precision

Whole pounds everywhere a figure is read. Pence only where a user types or reconciles an exact amount (tax records, edit forms). Percentages to at most 1 decimal place; a rate the user entered shows as entered, to at most 2. Durations over 24 months read as years and months ("3 years 4 months"). Dates as "Mar 2030". Tabular numerals on all of it (existing law).

### P9. Colour in light mode (60-30-10)

1. About 60% sand canvas, 30% cards and at most one tinted section, 10% accent (teal hero and buttons, apricot for debt).
2. Cards separate from the canvas by a visible edge (section 4.1), not by tint. KPI cards are never tinted and there is no coloured header band (round 5).
3. Each domain has one colour, used on its icon tile and its chart series everywhere (data-viz rule 5): teal for net worth, mortgage and pension, sage for savings, apricot for debt, neutral for pay and tax.
4. At most one tinted section per page (`surface.tint.*`), never around a `KpiStrip`, a `ScenarioZone` or a chart.
5. Dark mode keeps Direction C as it is; the only dark change is removing the indigo slab.

### P10. Charts (data-ink ratio)

1. Every chart has a one-sentence summary directly under the title, with at most 2 figures.
2. Up to 3 series are labelled directly at the line end; a legend only for 4 or more.
3. At most one annotation, on the point that answers the page's question (payoff month, retirement age).
4. At most 6 x-axis ticks; years as "2030", not "Year 5".
5. "Show data" is a quiet text button under the chart, not a full-width bar.
6. Do not draw a chart with fewer than 3 points or a flat series; show the summary sentence and a one-line prompt instead.
7. Forecast lines are dashed with the assumption in the caption (existing rule).
8. One chart per region; no donut where a ranked list already shows the split.

### P11. Motion

Token durations and easings only (`fast` for hover and press, `base` for tabs and disclosure, `slow` for sheets and dialogs). Scenario results cross-fade over `fast` when an input changes; no count-up animation. Everything under `_motionSafe`; charts use `useChartAnimation`.

### P12. Empty, loading and error

1. Every route shows a `PageSkeleton` (header, hero block, 3 KPI cards, 2 cards) while its loader is pending beyond 200ms. `NavigationProgress` stays.
2. An empty page is `PageHeader` plus one `EmptyState` with one illustration and one button. No tabs, strips or zones around it.
3. Errors keep the app shell and offer one way back.

### P13. Page template

Every app page renders through `PageBody`: content width 1200px at most, gutters 16px at 375, 24px from `md`, 40px from `lg`; 32px between the app header and the h1 at `lg`, 20px at 375; section gap 32px. Order: `PageHeader`, `HeroFigure`, `KpiStrip`, "Your details", `ScenarioZone`, drawers.

## 4. Design-system changes first

All paths are under `/Users/marcgallagher/personal/flump/.claude/worktrees/focused-ramanujan-0dfc2c/` (shown relative). Hex values below are starting points; the real values are whatever passes `packages/ui/src/tokens/tokens.a11y.test.ts` with `KNOWN_FAILURES` empty.

### 4.1 Tokens (PR 1)

| Change               | Token                                                            | Proposal                                                                                                                                                                                                                                                                                                          | Fixes             | Pages                    |
| -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------ |
| New                  | `surface.tint.teal`, `surface.tint.apricot`, `surface.tint.sage` | Light about `#e4f0eb`, `#fbecd9`, `#eaf0e2`; dark about `#1f302c`, `#33281b`, `#262d22`. Text pairs `text.primary` and `text.secondary` at 4.5:1; at least 2.0 deltaE from every other surface. Used for icon tiles and at most one section per page (P9)                                                         | A5, B colour gaps | All app pages, marketing |
| Changed              | Light card separation                                            | `Card`, `KpiCard`, `Table`, `CollapsibleDrawer` take a 1px `border.DEFAULT` edge (today the hairline is near invisible), and light `shadows.card` is strengthened in the warm ink (about `0 1px 2px rgba(43,38,32,.07), 0 4px 12px rgba(43,38,32,.05)`). Add a test: card edge against canvas at least 1.3:1      | A5, B elevation   | All                      |
| Changed (owner, D12) | `status.info`                                                    | Retune from indigo to a muted blue that sits with the palette (around `chart.accentCyan`: light text `#1d5670` on `#e3eff4`, border `#b3d2df`, solid `#2f7fa0`; dark text `#9fd0e6` on `#1a2d36`). This reverses round 5 item 6, so it waits for the owner. Disclaimers stop using `status.info` regardless (4.4) | A4                | All                      |
| Kept                 | `surface.hero`                                                   | Value unchanged. Treatment moves into `HeroFigure`: one soft decorative shape at low alpha of `primary.solid` (round 5 "big soft shapes"), `aria-hidden`                                                                                                                                                          | A6                | All domain pages         |
| None                 | Note style                                                       | No new token: the note style is `text.secondary`, `border.subtle` and the parent surface                                                                                                                                                                                                                          | A3, A4            | All                      |
| None                 | Charts                                                           | No new chart tokens. Annotations use `text.secondary` and `chart.baseline`                                                                                                                                                                                                                                        | A12               |                          |

AGENTS.md section 2 gains `tint.{teal|apricot|sage}` in the `surface.*` list, and section 3 gains three lines (number budget and one notice per surface pointing at this plan; single `Tabs`; `HeroFigure` and `PageBody`). Per DECISIONS conflict 2, these law edits are made once, in PR 1, and flagged in its description.

### 4.2 Type scale (PR 1)

- **Fix `4xl` to `6xl`.** They are defined at `packages/ui/src/tokens/index.ts:146-148` and passed to the preset at `packages/ui/panda.preset.ts:36`, yet the Typography story renders them at body size. Find the cause (story keys or generation) and add a foundations test that each `fontSizes` key resolves to its value.
- **New textStyles** in `packages/ui/src/tokens/typography.ts`: `numeric.hero` (fluid 2.25rem to 3rem, bold, tabular; add it to the list of styles allowed to use `clamp()`), `numeric.unset` (body.md size, regular, used with `text.muted`), and confirm `numeric.kpi` as the only KPI value style. `label.sm` loses uppercase and tracking (P7.3).
- **Weights stop at 700.** Map every 800 and 900 to `bold` (the heading face tops out at 800 and clamps anyway, `docs/design/e15/tokens.md:134`).
- **Close the leak with a law** (4.7): font sizes come from textStyles; `12px`, `11px`, `13px`, `15px`, `1.1rem`, `1.0625rem` and ad hoc `clamp()` literals go to a shrinking baseline.

### 4.3 Spacing, page template, elevation, motion (PR 1 tokens, PR 2 components)

- `packages/ui/src/tokens/layout.ts`: add `sizes.page.max` (1200px) and `spacing.page.{gutter,top,section}` with the P13 values. `AppShell` already sets gutters and top padding (`packages/ui/src/patterns/AppShell/AppShell.styles.ts:39-40`) but pages wrap themselves differently (24, 64 and 192px); `PageBody` becomes the only wrapper.
- Motion: no new tokens. Replace the 25 or more `0.15s ease` and `0.2s ease` literals with `durations` and `easings` from `packages/ui/src/tokens/motion.ts`, and add the law.
- Elevation: only the light `card` change above.

### 4.4 Notices and scenario zone (PR 2)

- **`ProjectionNotice`** (`packages/ui/src/patterns/ProjectionNotice/`): default becomes the `note` variant (P4.2), with `role="note"` and `data-notice="projection"` so tests can count it. The text constant at `ProjectionNotice.tsx:16` does not change. The banner look is removed, not kept as an option.
- **`ScenarioZone`** (`packages/ui/src/patterns/ScenarioZone/`): lighter, so the illustration no longer outweighs saved facts. Fill moves from `surface.sunken` to `surface.subtle`; the dashed outline becomes a 1px dashed `border.DEFAULT`; one header row (title left, "Illustration, not saved" badge right); the basis line is `body.sm` in `text.secondary`; tools use `Tabs size="sm"`; children sit on the zone surface without nested card chrome and nested headings; the footer holds "Reset to saved figures", "Update your details" and the page's single notice. `docs/design/e15/scenario-zone.md:37` is updated to match. The badge text, title pattern, reset label and state rules are unchanged.
- **`InlineAlert`**: `tone="info"` stays for actionable information only; add a story that says so.

### 4.5 Components (PR 2)

| Component                                                                              | Change                                                                                                                                                                                                                                                                                                          | Fixes    | Pages                                                              |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| `Tabs` (`packages/ui/src/primitives/SegmentedTabs/`, renamed or re-exported as `Tabs`) | The one tabs component: segmented look, `size: sm or md`, horizontal scroll at 375, at most 4 items (dev warning above). Replaces `FLPTabs` (`apps/web/app/components/core/tabs/FLPTabs.tsx`), the underline tabs in the debt, pension and mortgage containers, `BudgetNav` and the Residential/BTL button pair | A8       | Debt, mortgage, pension, savings, take-home, tax, settings, budget |
| `HeroFigure` (new, `packages/ui/src/patterns/HeroFigure/`, five files)                 | Label, value in `numeric.hero`, one optional delta or sub-line, optional "Estimate" tag. Sets `data-tone="hero"`. Falls back to a plain block when the value is unknown (as `KpiCard` does at `KpiCard.tsx:120`)                                                                                                | A6       | All domain pages                                                   |
| `KpiCard` (`packages/ui/src/primitives/KpiCard/`)                                      | Caption optional and figure-free by guidance; unknown values use `numeric.unset` with an `action` slot; value baseline no longer shifts with a badge (known #15: after the pre-release fix PR merges); `tone="hero"` deprecated in favour of `HeroFigure`. New stories: no caption, "Not set", with delta       | A1, A7   | All                                                                |
| `KpiStrip` (`packages/ui/src/patterns/KpiStrip/`)                                      | Defaults to 3 columns; renders one `EmptyState` prompt when half or more children are unset (P3.2)                                                                                                                                                                                                              | A7       | Mortgage, debt, savings, tax                                       |
| `PageBody` and `PageSkeleton` (in `packages/ui/src/templates/PageTemplates/`)          | The P13 wrapper and the P12 skeleton, built from the existing `Skeleton` primitive                                                                                                                                                                                                                              | A10, A11 | All                                                                |
| `PageHeader` (`packages/ui/src/patterns/PageHeader/`)                                  | One `actions` slot documented as one primary and at most one secondary; no notice slot; description at most one line                                                                                                                                                                                            | A10      | All                                                                |
| `ChartFigure` (`packages/ui/src/patterns/ChartFigure/`)                                | `summary` becomes required; `directLabels`, `annotation` (one) and `maxTicks` (default 6) props; "Show data" as a quiet text button; `minPoints` guard that renders the summary and a prompt instead of a chart (P10.6); the notice it embeds today is removed (the page owns the one notice)                   | A12      | History, debt, mortgage, pension, savings, take-home               |
| `IconTile` (new, `packages/ui/src/primitives/IconTile/`)                               | 40px rounded tile on `surface.tint.*` behind a Lucide icon, one colour per domain (P9.3)                                                                                                                                                                                                                        | A5       | Dashboard, accounts, tools, marketing                              |
| `CollapsibleDrawer`                                                                    | A `quiet` variant (text button trigger) for "Show details" and "Show data"                                                                                                                                                                                                                                      | A12      | All                                                                |
| Legacy `FLP*` (`apps/web/app/components/core/`)                                        | Each page PR replaces the usages in its own files with `@repo/ui` primitives (`Button`, `TextInput`, `Select`, `Checkbox`, `Heading`, `Text`, `Dialog`, `StatusBadge`), including native `<select>`. PR 13 deletes the directory when usage is zero                                                             | B        | All                                                                |

### 4.6 Storybook hygiene (PR 2 for `packages/ui`, PR 13 for `apps/web` stories)

- Seven groups only: "1. Foundations", "2. Primitives", "3. Patterns", "4. Charts", "5. Calculators", "6. Pages", "9. Legacy" (deleted in PR 13). Retitle the unnumbered "Accounts", "Charts", "Dialogs", "Navigation", "Tax", "Debt", "Feedback", "Screens", "Core" and the duplicate "4. Pages" and "5. Pages".
- New foundations page "Page rules" (`packages/ui/src/foundations/PageRules/`) stating P1 to P13 with one good and one bad example each.
- Fix the Typography story sample copy (US spelling, "High Net Worth", "Tax Liability") and the `KpiStrip` story content ("Optimal", "High APR liabilities", "Debt-free horizon").
- `PageTemplates` stories (`DashboardTemplate`, `SimulatorTemplate` and the rest at `packages/ui/src/templates/PageTemplates/PageTemplates.tsx:299-635`) are rebuilt on the new pieces and become the reference each page PR matches.

### 4.7 Laws and enforcement (PR 1, helper in PR 2)

- **New `scripts/check-style-literals.ts`**, added to `check:laws` at `package.json:33`, with `scripts/style-literals-baseline.json` that only shrinks. It flags: `fontSize` values outside the textStyle and token scale, `fontWeight` above 700, transition or animation durations written as literals, and inline `style=` in `apps/web` and `apps/marketing`. Tests beside it follow `scripts/check-design-laws.test.ts`.
- **`scripts/check-design-tokens.ts`:** accept `surface.tint.*`; flag `status.info` inside `ProjectionNotice` and `ScenarioZone` recipes.
- **`packages/ui/src/tokens/architecture.laws.test.ts`:** add `HeroFigure`, `IconTile` and `PageRules` to the five-file lists; add a shrinking baseline of files importing `components/core/FLP*`, and a zero-tolerance rule for `FLPTabs` once PR 9 merges.
- **Plain-words test:** a new `apps/web/app/plain-words.test.ts` and an addition to `apps/marketing/src/copy.test.ts` with the P7.1 list and a shrinking allow-list. `apps/web/app/copy-guard.test.ts` belongs to E29-T3 and is not edited.
- **Page-rules test helper** (PR 2, `packages/ui/src/testing/pageRules.ts`): `countFigures(container)` using the audit's money, percent and duration patterns; `expectPageRules(container, { maxFigures, maxNotSet })`, which also asserts at most one `[data-tone="hero"]`, exactly the expected count of `[data-notice="projection"]` and at most one primary button. Every page PR adds one such test per page against a fixture for each onboarded persona (renter, homeowner).
- Baselines: each PR regenerates `scripts/design-token-baseline.json`, `scripts/tabular-baseline.txt`, `scripts/react-icons-baseline.json` and the new baseline after its final rebase (see risks).

## 5. Per-page prescriptions

Each block lists first view, disclosure, removals, duplication and copy. Paths are in the PR's file list in section 6.

### Prerequisite: data gaps (A16, PR 3)

These are correctness faults and block a 10 on dashboard, accounts, mortgage, onboarding and pension.

1. **Property is not an asset.** Onboarding writes the property value to the profile as `homeValue` (`apps/web/app/features/onboarding/useFinishOnboarding.ts:63,82`), but net worth sums property from account rows only (`packages/finance-engine/src/picture/selectors/portfolio-totals.ts:34`). Result: the mortgage counts and the home does not. Fix per D3 (recommended: count it).
2. **LTV "not available" with both inputs present.** `apps/web/app/containers/mortgage/MortgageContainer.tsx:266-277` reads `profile.homeValue` and `loanAmount`; find why `hasLtvData` is false for the onboarded homeowner and add a regression test with that persona.
3. **Take-home changes between onboarding steps** (£2,194 then £2,087). One selector, one figure; when pension or student loan inputs change it, the summary bar says why ("Now includes your 5% pension and student loan"). Overlaps known #8: after the pre-release fix PR merges.
4. **Pension defaults the user never chose** ("Salary sacrifice", "5% placeholder growth"). Contribution method is "Not set" until chosen; growth is an assumption shown only in the scenario zone as "Assumes 5% growth a year". Overlaps known #8.

### Dashboard (PR 4)

- **First view:** h1 ("Your money"; no "Welcome back", no subtitle about modules), `HeroFigure` net worth with one delta ("up £320 since October"), `KpiStrip` of 3: left over this month, months of cover, and total owed (if any debt) or pension pot.
- **Below:** up to 4 section cards (D1), one figure, one line and one link each (P1.8), each with its `IconTile`. "Add..." links move into the section pages.
- **Disclosure:** `SetupChecklist` becomes one row under the strip ("Finish setting up: 2 of 5 done", expands on click) and disappears when complete. `MonthlyCheckInCard` becomes one row, shown only when a check-in is due. "Choose what shows here" stays behind the existing visibility panel.
- **Removed:** the guidance banner at the top (the dashboard shows saved figures; if a card shows a projection, the notice sits at the foot of the card grid, once); the net worth KPI card; the net worth line in `AccountsWidget`; the unsecured debt card above the hero (it becomes the debt section card, same content for everyone, per the R4 ruling); red on negative figures.
- **Duplicated elsewhere:** safe to spend detail stays on budget; assets and debts split stays on accounts.
- **Copy:** "Your live financial snapshot across your active modules" → removed. "Refine and drill down your baseline" → "Finish setting up". "Modules" → "sections".

### Sandbox (PR 4)

Same layout as the dashboard through the same components. Notices: `SandboxBar` plus one `ProjectionNotice` (P4.4); remove the "Sample data..." line, the subtitle repeat and the top banner. One "Sign up" button in the bar and one at the page end; locked cards show a lock icon and no inline link. "Ready to use your own bank feeds and HMRC data?" → "Ready to use your own figures?".

### Accounts (PR 5)

- **First view:** h1, one primary button ("Add account"), then the list: two groups, "What you own" and "What you owe", each a single table with a type column and a group total, then one "Net worth" total row. No hero (P6).
- **Disclosure:** change since last month and "No earlier month" move to the account detail view. Lists over 8 rows collapse.
- **Removed:** the "Where you stand" strip and the "Where your assets sit" bars (both restate the list); the ISA allowance card (owned by savings, link from the ISA row); the "Synced bank connections" block while bank connect is unavailable (D8); pence (known #16: after the pre-release fix PR merges).
- **Copy:** "Synced bank connections / connected bank credentials and balance feeds" → not shown. "Liabilities" → "What you owe".

### Net worth history (PR 5)

- **First view:** h1, `HeroFigure` "Change since last month", the chart with a summary sentence and the end point labelled with net worth.
- **Rule:** with fewer than 3 months, no chart: "You have one month of history. The chart appears after your third check-in." plus the check-in button (P10.6).
- **Disclosure:** the monthly table in a `CollapsibleDrawer` once over 8 rows.
- **Removed:** months of cover (owned by budget); the indigo note (becomes the quiet notice under the chart); custom gutters.

### Budget (PR 5)

- **First view:** h1, primary button by state ("Set up your budget" or "Edit budget"), `HeroFigure` "Left over each month", `KpiStrip` of 3: money in, bills and essentials, flexible spending. Weekly safe to spend becomes the hero's sub-line.
- **Below:** one category list, ranked by amount, with a thin proportion bar per row. This replaces the donut, its legend and the "Fixed and flexible" cards (the same split three times; P10.8).
- **Disclosure:** the 8-item pill nav goes; categories are rows that open their entries; "Add category" is one button at the list foot. Months-of-cover what-ifs live in the `ScenarioZone` "Model a change to your budget" with the page's notice.
- **Moved:** the renter's housing cost card goes below the strip as a "Your details" card showing the figure and an "Edit" button; the form opens in a dialog.
- **Copy:** "Create budget" (when one exists) → "Edit budget". "Discretionary allowance" → "Flexible spending".

### Debt (PR 6)

- **First view:** h1, "Add a debt" button, headline per D2 (default: `HeroFigure` "Total you owe" with the first KPI "Debt-free by Mar 2030, at your current payments", tagged "Estimate"), `KpiStrip` of 3: debt-free date, monthly payments, interest this year. Missing APRs produce one prompt ("Add the rate for 2 debts to see your debt-free date"), not "Not set" cards.
- **Your details:** "Your debts" list, one figure per row (balance); rate and minimum payment in the row detail. The MoneyHelper line stays exactly where it is for every user (R3 exception).
- **Scenario zone:** one tool by default, "Pay extra each month": one slider, the outcome ("Debt-free 8 months sooner"), 2 supporting figures, one chart with the payoff month annotated. Payoff order becomes one `Tabs` control ("Smallest balance first" or "Highest rate first") above the same result block, not two near-identical cards. The reference card about UK debt products moves into a quiet `CollapsibleDrawer`.
- **Removed:** the "what if the money went into savings" tool (D5); the red "1 high APR account" badge and flame icon; the warning line; tabs in the empty state.
- **Copy:** "Active liability accounts" → "Your debts". "Creditor" → "Lender". "Debt remaining (solid)" legend → direct labels. Known #5 and #6: after the pre-release fix PR merges.

### Mortgage (PR 6)

- **Missing rate or term:** `PageHeader`, the saved balance and payment as two plain figures, and one prompt: "Add your interest rate and years left to see your payoff date and what overpaying would change", with one button. No KPI strip of "Not set", no empty cost, LTV or chart cards, and the scenario zone is hidden.
- **Complete data, first view:** h1, `HeroFigure` "Monthly payment" with sub-line "Paid off by Jun 2051", `KpiStrip` of 3: balance, rate with fix end date, loan to value.
- **Your details:** one card with an "Edit" button. The linked-account native select moves into the edit dialog. Housing cost is not shown separately (the payment is the hero).
- **Disclosure:** cost breakdown and LTV milestones each in a `CollapsibleDrawer` ("Show details"); the amortisation schedule stays in a drawer. Residential or buy-to-let becomes `Tabs` under the h1, shown only when the user has both.
- **Scenario zone:** 3 tools in `Tabs` (overpay, rate change, overpay or save). "Try different starting figures" moves behind "More options"; no slider starts at 0 for a known value.

### Pension (PR 7)

- **First view:** h1, headline per D2 (recommended: `HeroFigure` "Estimated income at retirement: £1,240 a month", tagged "Estimate", sub-line "At 67, in today's money"; default fallback: hero on "Total in your pots" with the estimate as the first KPI), `KpiStrip` of 3: total in your pots, going in each month (you and employer as one figure), retirement age.
- **Your details:** one card: salary, your contribution, employer contribution, method. This replaces the "Your details" bar and the contribution KPI caption.
- **Scenario zone:** 3 inputs (your contribution, retirement age, growth); the outcome figure with 2 supporting figures; one chart with the retirement age annotated. Growth is the slider only (D6).
- **Disclosure:** "Assumptions and UK rules" in one quiet `CollapsibleDrawer` holding both assumption paragraphs as a short list (fixes the clipped box). The effect on take-home is a second tool tab, not a visible card.
- **Removed:** quick growth-rate chips; the PLSA bar (D6); two-figure captions; the "Employer and growth £438,817, of which..." sentence (becomes one row in the drawer).

### Savings (PR 7)

- **First view:** h1, "Add account" button, `HeroFigure` "Total savings", `KpiStrip` of up to 3 real values only: saved each month, average rate, ISA allowance used. Cards with no real value are hidden (P3.3); if nothing is set, one prompt.
- **Your details:** accounts list, one figure per row. ISA allowance lives here (owner page), one bar and 2 figures.
- **Scenario zone, one zone:** the forecast sliders (rate, years ahead) and monthly amount move inside "Model a change to your savings" (the standing saved-versus-scenario rule), with one outcome ("About £X in 5 years"), 2 supporting figures and one chart. With £0 a month and no rate, no chart (P10.6). The bare three-input second zone is merged in.
- **Removed:** the milestone tiles (D4); the three separate result cards; the top banner.
- **Kept:** the deposit timeline from E32, as a second tool tab.
- **Copy:** "Weighted by balance (AER)" → "Average rate". "Liquid cash" → "Cash you can get at quickly".

### Take-home (PR 8)

- **First view:** h1, `HeroFigure` "Monthly take-home" in whole pounds with sub-line "£25,408 a year", then "Where your pay goes": one table of 4 to 5 rows (income tax, National Insurance, pension, student loan, take-home) with a thin stacked bar above it. This replaces the donut plus legend plus table.
- **Your details:** the saved breakdown is outside the scenario zone. The zone holds only what-ifs: "A pay rise" and "The next £1,000", as two `Tabs`.
- **Disclosure:** effective rate and the pay that counts for pension go in "Show details".
- **Removed:** the weekly and daily strip (D7); pence; the bottom disclaimer line (the zone footer has the one notice); the repeated "Unverified estimate" (known #9: after the pre-release fix PR merges); any £100,000 banner (P7.5). The link to savings stays as "Model this in savings".
- **Copy:** "Qualifying gross" → "Pay that counts for your pension".

### Self assessment (PR 8)

- **Visibility:** an opt-in section (E16 D3-B). PAYE-only users do not get it in the nav; visiting the URL shows one `EmptyState`: "Self assessment is for income outside PAYE, such as self-employment or rent" with "Turn on self assessment" (D9). `/app/tax` and `/app/self-assessment` stay one page.
- **Opted in, first view:** h1 with the tax year control, `HeroFigure` "Estimated bill" with the "Unverified estimate" badge, `KpiStrip` of 3: set aside so far, still to set aside, next payment date.
- **Below:** income sources as one list with one "Add income" menu button (replacing three "Add..." buttons, "Quick add" and two "Copy from 2025/26"; "Copy from last year" lives in that menu). Record tables stay in drawers. At most 6 buttons in view.
- **Removed:** the "next £1,000" explorer (owned by take-home, link only); "0 records" badges in four colours (empty sources show nothing); the header-row disclaimer; `TaxTrapAlertBanner` as a banner.

### Settings (PR 9)

No hero. h1 "Settings", `Tabs` (Profile, Security, Data), form sections with `@repo/ui` `Select` and `TextInput`. The email appears once. "Save changes" is the one primary button, enabled when something changed. The three "Go to..." buttons become text links in their sections. "Optional modules" → "Sections you use".

### Onboarding (PR 9, after PR 3 and the pre-release fix PR)

A focused shell: logo, stepper, "Save and exit"; no app nav. "Skip for now" appears only on optional steps and as a text link. The live summary shows one figure (monthly take-home) and explains any change. The review lists only what the user entered (no "Not applicable" rows); "Modules switched on" → "Sections we have set up for you". Stepper wrap and duplicate links are known #19.

### App chrome, error and 404 (PR 9)

At 375, the bottom bar is the navigation and its last item ("More") opens the drawer; the hamburger is removed. Error and 404 pages keep the normal header for the user's state and one way back (unknown `/app/*` is known #2). Every route gets `PageSkeleton` (P12.1).

### Calculators and tool pages (PR 10, PR 11)

- **Calculator bodies** (seven old ones): rebuilt on `SimulatorSplitLayout`, `SliderField`, `KpiCard` and `ChartFigure` to match the pay-rise tool. One outcome figure, at most 2 supporting, at most 3 visible inputs with "More options". Results never use `status.danger` or `status.warning` for a saving. "Liability 1" → "Debt 1".
- **One catalogue:** a single data source for both apps (D11) with one title, description and icon per tool; no dollar-sign icons (Lucide pound or a domain `IconTile`). Slug alignment and the missing pay-rise tool are known #4.
- **Tool page order:** breadcrumb, h1, one-line description, the tool, its single notice in the zone footer, then the guide and FAQ in `CollapsibleDrawer`s. Remove the category badge, the top banner and the "Illustration only" line.
- **Index pages:** h1 "Free UK money calculators" on both; cards on `surface.card`; a grid that leaves no orphan row; no eyebrow. The income-over-£100,000 tool is listed last and never featured (owner rule).
- **Copy:** "UK MORTGAGE & WEALTH ENGINE" → removed. "Mathematically compare the guaranteed interest savings..." → "Compare the interest saved by overpaying with what the same money might earn in an ISA." "Flump syncs your live balance and monitors fixed-rate renewal dates automatically" → "Sign up to keep your own figures in one place." "psychological momentum" is known #12.

### Marketing (PR 12, copy needs owner sign-off, D15)

- **Home:** five sections instead of nine: hero (headline, one sentence, "Request an invite", product preview built from real components and system tokens, 3 figures); "What you can see" (3 cards with `IconTile`s); one live teaser (pay rise); a short security strip on a tinted section linking to `/security`; FAQ and final CTA. "Request an invite" appears twice (hero, end). MCP leaves the home page for a footer link and one FAQ answer (D13). No near-black band, no monospace pills, no purple glow, no bright green, blue or red figures.
- **Pricing:** per D10. Default: free plan first and prominent; the future plan as one quiet card with the placeholder price and no billing toggle or example price.
- **Security:** intro plus one list of facts; the two cards that repeat the intro go; the contact is one line (the placeholder address stays as decided in E7 until the domain exists, shown as a link, not body copy).
- **MCP:** written for a household reader first: what it is in two sentences, three example questions, how to turn it on, then one collapsed "Technical details". Primary CTA "Request an invite". No all-caps or monospace styling outside code samples.
- **Contact:** two cards (general, security) instead of six.
- **Header and footer:** placeholders are known #13; touch only after the pre-release fix PR merges.

## 6. PR sequence

No stacking: every PR branches from `main` after its dependencies have merged. Page PRs do not edit `packages/ui`; a missing design-system piece is logged for PR 13 (or added as a new colocated directory nobody else touches). Each UI PR attaches 375 and 1280, light and dark frames. Local pre-flight for each: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run check:laws`, and the changed packages' tests only; CI gates "ready".

Model guidance follows AGENTS.md section 6: implementation is `opus`; where a PR is marked "mechanical parts", those parts may go to `sonnet` subagents with an exact spec.

### Waves

| Wave | PRs                         | Why they do not collide                                                                                                                                                                                                                                  |
| ---- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | PR 1, PR 3                  | PR 1: `packages/ui/src/tokens`, `foundations`, `scripts`, docs. PR 3: `packages/finance-engine`, onboarding hooks, one block of `MortgageContainer.tsx`                                                                                                  |
| 1    | PR 2, PR 10                 | PR 2: `packages/ui/src/{primitives,patterns,templates,testing}`. PR 10: `packages/ui/src/calculators` only. Shared file: `packages/ui/src/index.tsx` (PR 2 owns; PR 10 exports through `calculators/index.ts`)                                           |
| 2    | PR 4, 5, 6, 7, 8, 9, 11, 12 | Disjoint directories (table in each PR). Shared hot files have one owner: `features/housing` (PR 6), `features/take-home/.../NextPoundExplorer` (PR 8), `components/navigation` and `components/dialogs` (PR 9), marketing `Header` and `Footer` (PR 12) |
| 3    | PR 13                       | Runs alone after everything merges                                                                                                                                                                                                                       |

Merges within a wave are serial: rebase on `main`, regenerate baselines, push, wait for CI.

### PR 1. Design-system foundations: tokens, type scale, motion, laws

- **Goal:** the rules exist as tokens and are enforced.
- **Scope:** sections 4.1, 4.2, 4.3 (tokens), 4.7 (scripts and tests), AGENTS.md and docs edits.
- **Files:** `packages/ui/src/tokens/{index.ts,typography.ts,layout.ts,elevation.ts,motion.ts,tokens.a11y.test.ts,tokens.foundations.test.ts,architecture.laws.test.ts}`, `packages/ui/panda.preset.ts`, `packages/ui/src/foundations/{ColorPalette,TypographyScale,Elevation,Motion,SpacingAndRadii}`, `scripts/check-style-literals.ts` (new, with test and baseline), `scripts/check-design-tokens.ts`, `package.json` (`check:laws`), `apps/web/app/plain-words.test.ts` (new), `apps/marketing/src/copy.test.ts`, `AGENTS.md`, `docs/design/e15/tokens.md`.
- **Depends on:** D12 for the `status.info` retune only (everything else proceeds). **Parallel group:** wave 0.
- **Acceptance:** `4xl` to `6xl` render at 36, 48 and 60px in the Typography story; `surface.tint.*` pass contrast in both themes with `KNOWN_FAILURES` empty; a light card on canvas has a visible edge at 1280 and 375; `check:laws` runs the new script and fails on a new 800 weight, a new `13px` or a new `0.2s ease`; no visible change to any page other than card edges.
- **Tests and laws:** token tests extended; new script test; baselines written.
- **Score:** design system 8 / 7. **Model:** opus, design judgement for the tint values and elevation.

### PR 2. Design-system components and Storybook

- **Goal:** pages can meet P1 to P13 by composition.
- **Scope:** sections 4.4, 4.5, 4.6 and the page-rules helper.
- **Files:** `packages/ui/src/primitives/{SegmentedTabs,KpiCard,CollapsibleDrawer,InlineAlert,Skeleton,IconTile (new)}`, `packages/ui/src/patterns/{HeroFigure (new),KpiStrip,PageHeader,ProjectionNotice,ScenarioZone,ChartFigure,EmptyState}`, `packages/ui/src/templates/PageTemplates`, `packages/ui/src/foundations/PageRules` (new), `packages/ui/src/testing/pageRules.ts` (new), `packages/ui/src/index.tsx`, story titles across `packages/ui`, `docs/design/e15/scenario-zone.md`, `docs/design/data-viz.md`.
- **Depends on:** PR 1. `KpiCard` baseline work after the pre-release fix PR merges (known #15). **Parallel group:** wave 1.
- **Acceptance:** one `Tabs` story covering 2, 3 and 4 items at 375; `ProjectionNotice` shows no fill and no indigo in either theme and exposes `data-notice`; in the `SimulatorTemplate` story the `ScenarioZone` is visibly lighter than the "Your details" card above it; `KpiCard` "Not set" is smaller and lighter than a value; `ChartFigure` fails type-check without `summary` and draws no chart with 2 points; `packages/ui` Storybook has seven top-level groups; `DashboardTemplate` and `SimulatorTemplate` stories pass `expectPageRules` with `maxFigures` 10 and 12; zero a11y violations light and dark.
- **Tests and laws:** stories with `play()` for `Tabs`, `HeroFigure`, `IconTile`; unit tests for `countFigures`.
- **Score:** design system 9.5 / 9.5 (10 after PR 13 removes the legacy layer). **Model:** opus, design judgement throughout; run the `ui-compliance-reviewer`.

### PR 3. Data correctness: property, LTV, onboarding take-home, pension defaults

- **Goal:** no screen shows a wrong or unexplained figure (A16).
- **Scope:** the four fixes in section 5 "Prerequisite".
- **Files:** `packages/finance-engine/src/picture/{build.ts,input.ts}`, `packages/finance-engine/src/picture/selectors/portfolio-totals.ts` (and tests, `personas.test.ts`), `apps/web/app/utils/financialPicture.ts`, `apps/web/app/features/onboarding/{useFinishOnboarding.ts,deriveOnboardingSummary.ts}`, `apps/web/app/features/onboarding/components/LiveSummaryBar`, `apps/web/app/containers/mortgage/MortgageContainer.tsx` (lines 266 to 277 only), pension default seeding in `apps/web/app/containers/pension/PensionContainer.tsx` (defaults only).
- **Depends on:** D3; the pre-release fix PR (known #8) for items 3 and 4. **Parallel group:** wave 0.
- **Acceptance:** the homeowner persona's net worth is £310,000 + £21,000 + £96,000 - £186,000 = £241,000 with the home as a labelled part; the mortgage page shows 60% loan to value for that persona; onboarding shows the same take-home on every step or one sentence explaining the change; a new user's pension method reads "Not set".
- **Tests and laws:** persona fixtures; a selector test for property; loader tests. No UI law changes.
- **Score:** unblocks dashboard, accounts, mortgage, onboarding. **Model:** opus (new logic); not a design task.

### PR 4. Dashboard and sandbox

- **Files:** `apps/web/app/features/dashboard/components/*` (`HomeDashboard`, `DashboardKpiStrip`, the seven `*Widget`s, `WidgetCard`, `SetupChecklist`, `StageCoachCard`, `NotSetValue`, `DashboardEmptyState`), `apps/web/app/features/snapshot/components/MonthlyCheckInCard`, `apps/web/app/routes/{_index.tsx,app._index.tsx,sandbox.tsx,app.sandbox.tsx}`, `apps/web/app/features/sandbox`, `apps/web/app/features/signed-out/components/{SandboxBar,SampleDataNote}`.
- **Depends on:** PR 2, PR 3, D1. **Parallel group:** wave 2.
- **Acceptance (both personas, 375 and 1280, light and dark):** net worth appears once; first view has at most 4 figures and the hero is visible at 375 without scrolling; whole page at most 10 figures; at most 4 section cards with exactly one figure each; no notice above the h1; no red figure; sandbox shows exactly 2 notices and 2 "Sign up" buttons; none of "module", "widget", "baseline", "Welcome back", "bank feeds" in the DOM.
- **Tests:** `expectPageRules` per persona and for the sandbox; existing route tests updated.
- **Score:** 10 / 10 dashboard, 10 / 10 sandbox. **Model:** opus, design judgement.

### PR 5. Accounts, history and budget

- **Files:** `apps/web/app/features/accounts/components/*`, `apps/web/app/components/accounts/*`, `apps/web/app/routes/{app.accounts._index.tsx,app.accounts.$account.tsx,app.accounts.history.tsx,app.budget.tsx}`, `apps/web/app/features/snapshot/components/{SnapshotHistoryPage,NetWorthHistoryChart,MonthlyChangeTable}`, `apps/web/app/containers/budget/BudgetContainer.tsx`, `apps/web/app/features/budget/components/*`.
- **Depends on:** PR 2, PR 3; D8; the pre-release fix PR for known #7, #16 and #17. **Parallel group:** wave 2. Does not edit `features/housing` (PR 6) or `MonthlyCheckInCard` (PR 4).
- **Acceptance:** accounts: no hero, two tables at most, net worth once, no bank connections block, 0 pence; history: no chart with fewer than 3 months, hero is the change, gutters match other pages; budget: hero is "Left over each month", no donut, no pill nav, the split appears once, primary button matches state, no form above the hero. Each page at most 4 figures in first view.
- **Tests:** `expectPageRules` for the three pages; `BudgetNav` removed with its tests.
- **Score:** 10 / 10 each. **Model:** opus; accounts table merge is mechanical.

### PR 6. Debt and mortgage

- **Files:** `apps/web/app/containers/debt/DebtContainer.tsx`, `apps/web/app/features/debt/components/*`, `apps/web/app/containers/mortgage/MortgageContainer.tsx`, `apps/web/app/features/mortgage/components/*`, `apps/web/app/features/housing/components/HousingCostCard`, `apps/web/app/routes/{app.debt.tsx,app.mortgage.tsx}`.
- **Depends on:** PR 2, PR 3, D2, D5; the pre-release fix PR for known #5 and #6. **Parallel group:** wave 2.
- **Acceptance:** debt: at most 1 "Not set" prompt, one tool visible in the zone, no red badge or flame, the MoneyHelper line unchanged for a user with and without debts, at most 10 figures; mortgage with balance only: 2 figures, 1 prompt, 0 "Not set" cards, no scenario zone; mortgage complete: hero "Monthly payment", 3 KPIs, zone lighter than details; one tabs style on both pages; changing a scenario input leaves the hero and strip unchanged (existing per-page test).
- **Tests:** `expectPageRules` for debt (with and without debts) and mortgage (partial and complete).
- **Score:** 10 / 10 each. **Model:** opus, design judgement (mortgage states).

### PR 7. Pension and savings

- **Files:** `apps/web/app/containers/pension/PensionContainer.tsx`, `apps/web/app/features/pension/components/*`, `apps/web/app/containers/savings/SavingsContainer.tsx`, `apps/web/app/features/savings/components/*`, `apps/web/app/routes/{app.pension.tsx,app.savings.tsx,app.forecast.tsx}`.
- **Depends on:** PR 2, PR 3, D2, D4, D6. **Parallel group:** wave 2.
- **Acceptance:** pension: at most 12 figures (from 41), 4 in first view, no chips, no caption with a figure, height at 375 under 2,400px (from 4,017px); savings: no `£0` or `0.00%` KPI, no slider outside the `ScenarioZone`, one zone, no chart when the line would be flat, no milestone tiles; one notice per page, inside the zone footer.
- **Tests:** `expectPageRules`; the saved-versus-scenario test extended to the moved savings sliders.
- **Score:** 10 / 10 each. **Model:** opus, design judgement (largest cut in the plan).

### PR 8. Take-home and self assessment

- **Files:** `apps/web/app/containers/takeHome/TakeHomeContainer.tsx`, `apps/web/app/features/take-home/components/*`, `apps/web/app/containers/tax/TaxContainer.tsx`, `apps/web/app/features/tax/components/*`, `apps/web/app/components/tax/TaxEstimateNote`, `apps/web/app/routes/{app.take-home.tsx,app.tax._index.tsx,app.self-assessment.tsx}`.
- **Depends on:** PR 2, D7, D9; the pre-release fix PR for known #7, #8 and #9. Nav visibility for self assessment is a one-line request to PR 9's owner (`navConfig.ts`), or lands in PR 9. **Parallel group:** wave 2.
- **Acceptance:** take-home: 0 figures with pence, each pay part appears once, saved breakdown outside the zone, at most 9 figures; self assessment: a PAYE-only user sees one empty state with one button and no `£0`; an opted-in user sees at most 6 buttons in the first view, "Unverified estimate" once, no explorer; no £100,000 banner on either page.
- **Tests:** `expectPageRules`; button-count assertion for tax.
- **Score:** 10 / 10 each. **Model:** opus.

### PR 9. Settings, onboarding, app chrome, loading and error states

- **Files:** `apps/web/app/features/settings/components/*`, `apps/web/app/routes/app.profile.tsx`, `apps/web/app/features/onboarding/components/*` (not `LiveSummaryBar` logic, done in PR 3), `apps/web/app/routes/{app.onboarding.tsx,$.tsx,$feature._index.tsx,callback.tsx}`, `apps/web/app/components/navigation/*`, `apps/web/app/components/structure/header`, `apps/web/app/components/dialogs/*`, `apps/web/app/root.tsx` (skeleton fallback).
- **Depends on:** PR 2, PR 3; the pre-release fix PR for known #2, #3, #11, #14 and #19. **Parallel group:** wave 2. Each page PR wires `PageSkeleton` in its own route file; this PR owns the root fallback.
- **Acceptance:** settings has no hero and no native `<select>`; onboarding shows no app nav and at most 1 figure per step; one navigation control at 375; a throttled navigation shows a skeleton; 404 and error pages have the normal header; dialogs in `components/dialogs` import no `FLP*`.
- **Tests:** existing onboarding and route tests; a nav test for the 375 pattern.
- **Score:** 10 / 10 settings, onboarding, error. **Model:** opus for onboarding and nav; the `FLP*` swaps in dialogs and settings are mechanical (sonnet).

### PR 10. Calculator bodies

- **Files:** `packages/ui/src/calculators/{DebtSnowballCalculator,MortgageVsIsaCalculator,OverdraftCostCalculator,Section24Calculator,StudentLoanCalculator,TaxTrapCalculator,ZeroPercentCliffCalculator,MarginalRateExplorer}`, `packages/ui/src/calculators/index.ts` and tests.
- **Depends on:** PR 1 (tokens). Uses `ProjectionNotice` and `ChartFigure` by import, so it merges after PR 2. D11 if any calculator is retired. **Parallel group:** wave 1. `TaxTrapCalculator` copy must still meet R2, R5, R6 and R8 (E25-T11 owns that directory's copy: coordinate).
- **Acceptance (per calculator, 375 and 1280):** uses `SimulatorSplitLayout` and `SliderField`; one outcome figure and at most 2 supporting; no saving shown in a danger or warning colour; no horizontal scroll at 375 (known #10: after the pre-release fix PR merges); no hard-coded radii or hex; exactly one notice.
- **Tests:** `packages/ui/src/calculators/calculators.test.tsx` and the live-region test updated; stories light and dark.
- **Score:** tool pages 8.5 / 8.5 on its own. **Model:** opus for the first calculator as the pattern; the other six are mechanical against it (sonnet with an exact spec).

### PR 11. One catalogue and tool pages

- **Files:** `apps/web/app/features/signed-out/toolsCatalog.ts` (moved to a shared source, for example `packages/ui/src/calculators/catalogue.ts`), `apps/web/app/features/signed-out/components/{ToolTile,ToolsGrid,ToolGuide,ToolBreadcrumbs,SignedOutPage,SignedOutFooter}`, `apps/web/app/routes/{tools._index.tsx,tools.$slug.tsx}`, `apps/web/app/components/tools/*Tool.tsx`, `apps/marketing/src/pages/{ToolsIndexPage.tsx,ToolPage.tsx}`, `apps/marketing/src/utils/toolSlugs.ts`.
- **Depends on:** PR 10, D11; the pre-release fix PR for known #3, #4 and #12. **Parallel group:** wave 2. Does not touch marketing `Header`, `Footer` or other pages (PR 12).
- **Acceptance:** both indexes show the same tools with the same titles, descriptions and icons from one source; no dollar icon; on a tool page the tool starts within the first 400px at 1280 and nothing but breadcrumb, h1 and one line precede it; one notice per tool page (the pay-rise page goes from four to one); the strings "ENGINE", "Mathematically", "guaranteed", "syncs", "monitors" are absent; guide and FAQ are collapsed.
- **Tests:** `tools.test.tsx`, `tools.guides.test.ts`, `ToolPage.test.tsx`, `ToolsIndexPage.test.tsx`; `claims.test.ts` in both apps.
- **Score:** 10 / 10 indexes and tool pages. **Model:** opus for the shared catalogue; page shells are mechanical.

### PR 12. Marketing pages

- **Files:** `apps/marketing/src/pages/{HomePage.tsx,PricingPage,SecurityPage.tsx,McpPage,ContactPage,NotFoundPage}`, `apps/marketing/src/components/{BigMovesSection,MonthlyPictureSection,PayRiseTeaser,McpSpotlightSection,SecurityPrivacySection.tsx,HomeFAQ.tsx,BaselineSnapshotPreview.tsx,DisclosurePolicySection,Header,Footer}`, `apps/marketing/src/utils/pricing.ts`, `apps/marketing/src/{copy.test.ts,claims.test.ts}`. Flat files that are substantially rewritten move into colocated directories (law 1).
- **Depends on:** PR 2; D10, D13, D15 (copy sign-off blocks merge, not the build); the pre-release fix PR for known #13. **Parallel group:** wave 2.
- **Acceptance:** home has 5 sections, under 3,600px at 1280 and under 5,500px at 375, 2 "Request an invite" buttons, no off-system colour (design-token check clean with no new baseline entries), no code block; pricing shows no billing toggle and no example price; security has no duplicated sentence; MCP page under 2,600px at 1280 with technical detail collapsed; contact has 2 cards; inline styles in marketing drop from 71 to 0.
- **Tests:** page tests updated; `PRICING` guard tests in `apps/marketing/src/utils/pricing.test.ts`.
- **Score:** home 9.5 / 10, pricing 9 / 9, security 10 / 10, MCP 9.5 / 9.5, contact 10 / 10. **Model:** opus, design and copy judgement; owner signs off copy.

### PR 13. Verification, legacy removal and re-score

- **Scope:** delete `apps/web/app/components/core/FLP*` once usage is zero and drop "9. Legacy" and "Core" from Storybook; retitle `apps/web` stories into the seven groups; clear what is left in the new baselines where cheap; fix design-system gaps logged by page PRs; re-run the same sweep (two onboarded personas, sandbox, signed-out, marketing; 375 and 1280; light and dark; DOM metrics) into `docs/design/e16-polish/after/`, including the renter 375 and dark frames the first pass missed; re-score every row of the scorecard and append the table to this file as "Result".
- **Files:** `apps/web/app/components/core/`, story files across `apps/web`, `scripts/*baseline*`, `docs/design/e16-polish/PLAN.md`.
- **Depends on:** all others. **Parallel group:** wave 3.
- **Acceptance:** `metrics-*.json` in `after/` show every page inside its N1 and N targets; 0 `FLP*` imports; 0 pages with more than one hero or more than the allowed notices; every row re-scored, and any row under 10 has a named follow-up.
- **Model:** sonnet for the sweep, retitling and deletions; opus for the re-score and gap fixes.

## 7. Owner decisions

"Default" says what happens if the owner does not answer. Items marked "waits" are not done without an answer.

| #   | Decision                                                                                            | Options                                                                                                                                                                                                                                             | Recommendation and reason                                                                                                                                                               | Blocks                  | Default                                                                                            |
| --- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| D1  | Dashboard headline and card count                                                                   | (a) Net worth hero, "left over this month" as first KPI, at most 4 section cards. (b) "Left over this month" hero. (c) Keep 5 or more cards                                                                                                         | (a). Net worth is the one figure that sums every section, is already the round 5 hero, and budget owns "left over". Four cards keeps the page near 10 figures                           | PR 4                    | Proceeds with (a)                                                                                  |
| D2  | May the hero hold an estimate computed from saved figures only (debt-free date, retirement income)? | (a) Yes, labelled "Estimate", with the notice directly below. (b) No: hero stays on a saved fact (total owed, pot total) and the estimate is the first KPI                                                                                          | (a) for simplicity: it puts the answer to the page's question in the headline. It needs compliance sign-off because the saved-versus-scenario spec says the hero goes on a saved figure | PR 6, PR 7              | Proceeds with (b); (a) waits for sign-off                                                          |
| D3  | Count the home as an asset in net worth                                                             | (a) Count the user's estimate at 100%, labelled "Home (your estimate)". (b) Leave both home and mortgage out of the headline. (c) Leave as is                                                                                                       | (a). Counting the mortgage without the home is wrong and shows homeowners a large negative figure. Co-owner share stays open under E30 round 8                                          | PR 3                    | Proceeds with (a)                                                                                  |
| D4  | Savings milestones                                                                                  | (a) Remove the tiles; keep one optional "Your own goal" input in the zone. (b) Keep the tiles                                                                                                                                                       | (a). "£1,000,000: not reached in 60 years" is discouraging and adds 6 or more figures                                                                                                   | PR 7                    | Proceeds with (a)                                                                                  |
| D5  | Debt "what if the money went into savings" tool                                                     | (a) Remove from debt; link to the overpay-or-save calculator. (b) Keep as a third tool tab                                                                                                                                                          | (a). It is a second tool with 3 cards and a chart, and the calculator already exists                                                                                                    | PR 6                    | Proceeds with (a)                                                                                  |
| D6  | Pension quick-rate chips and PLSA bar                                                               | (a) Remove both; one line in "Assumptions and UK rules" links to the PLSA standards. (b) Keep the bar in the drawer                                                                                                                                 | (a). Chips duplicate the slider; the bar adds 4 figures and compares the user with a standard, which reads as judgement                                                                 | PR 7                    | Proceeds with (a)                                                                                  |
| D7  | Take-home weekly and daily strip                                                                    | (a) Remove; keep weekly only as the budget hero sub-line. (b) Move to "Show details"                                                                                                                                                                | (a)                                                                                                                                                                                     | PR 8                    | Proceeds with (a)                                                                                  |
| D8  | Accounts bank-connections block while bank connect is unavailable                                   | (a) Hide for everyone except owner-allowlisted accounts. (b) Collapse to one "coming later" line                                                                                                                                                    | (a). Matches E16 D4-A and E19 D3-B                                                                                                                                                      | PR 5                    | Proceeds with (a)                                                                                  |
| D9  | Self assessment for PAYE-only users                                                                 | (a) Opt-in: out of the nav, one explainer if visited. (b) Visible to all                                                                                                                                                                            | (a). Already decided as E16 D3-B; this applies it                                                                                                                                       | PR 8                    | Proceeds with (a)                                                                                  |
| D10 | Pricing page's hypothetical plan and toggle                                                         | (a) Show only the free plan now (the launch state of E24 D2). (b) Keep the paid card with a placeholder price, remove the billing toggle and example price, make the free plan dominant. (c) No change                                              | (a) is simplest and most honest, but E24 D2 says the paid card stays during the friends beta, so it needs the owner. (b) fits the recorded decision                                     | PR 12                   | Proceeds with (b); (a) waits                                                                       |
| D11 | Two calculator catalogues and old calculators                                                       | (a) One shared catalogue and restyled calculators in both apps. (b) As (a), and signed-out web `/tools` redirects to marketing (E16 D7-B says marketing owns tool landing pages). (c) Also retire low-use calculators (overdraft cost, 0% deal end) | (a) now, (b) once marketing tool pages reach parity. (c) only with usage data                                                                                                           | PR 10, PR 11            | Proceeds with (a); (b) and (c) wait                                                                |
| D12 | Indigo `status.info`                                                                                | (a) Retune to a muted blue. (b) Keep indigo but never on disclaimers                                                                                                                                                                                | (a). Indigo is the loudest colour on most screens and the main dark-mode flaw. It reverses round 5 item 6                                                                               | PR 1 (token value only) | Proceeds with (b); (a) waits                                                                       |
| D13 | MCP and security sections on the marketing home page                                                | (a) MCP off the home page (footer link and one FAQ); security as one short strip. (b) Keep both                                                                                                                                                     | (a). The home page is for households; `/mcp` and `/security` remain                                                                                                                     | PR 12                   | Proceeds with (a), subject to D15                                                                  |
| D14 | Notice placement and style                                                                          | (a) One quiet note per surface at the foot of the first projection region, wording unchanged. (b) Keep the banner at the top                                                                                                                        | (a). R6 requires one notice per projection surface, not a position or colour. Owner and compliance should confirm; the solicitor view (E29b) may revisit                                | PR 2 and all page PRs   | Proceeds with (a): wording unchanged and always visible; collapsing or shortening the notice waits |
| D15 | Marketing copy sign-off                                                                             | Owner approves the new home, pricing, security, MCP and contact copy (E7)                                                                                                                                                                           | Required by a recorded decision                                                                                                                                                         | Merge of PR 12          | Waits (the PR can be built and reviewed)                                                           |
| D16 | How much colour in light mode                                                                       | (a) Tinted icon tiles and at most one tinted section per page, apricot as second accent for debt only. (b) As (a) plus sage and apricot section bands on marketing. (c) Tinted KPI cards or header band                                             | (b). The owner asked for more colour in light; (c) was rejected in round 5                                                                                                              | PR 1, PR 12             | Proceeds with (a) in the app and (b) on marketing                                                  |

## 8. Out of scope and risks

Out of scope:

- The mobile app (E12), new features, and any flow needing real WorkOS or bank credentials (sign-up, login, bank connect; they were not audited).
- The 19 defects in the pre-release report; their fix PR is separate. PRs here that share files wait for it, as marked.
- States not opened in the audit (BTL mortgage, payslip and receipt flows, budget wizard, check-in sheet, add and edit dialogs, secondary tabs). They inherit the system changes; PR 13 scores them and lists follow-ups.
- Notice wording, regulatory statements and tax-vector sign-off.

Risks:

| Risk                                                                                                                                                                                                                                       | Mitigation                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Baseline files conflict.** Every PR that removes violations rewrites `scripts/design-token-baseline.json`, `scripts/tabular-baseline.txt`, `scripts/react-icons-baseline.json` and the new style baseline, so parallel PRs collide there | The coordinator merges wave 2 one PR at a time; each PR regenerates baselines as its last commit after rebasing. Never hand-merge a baseline                                                                 |
| **Visual-regression baselines.** The E15 phase 8 session is building them in parallel, and every PR here changes pixels                                                                                                                    | E16 PRs do not edit visual baseline images. After each merge the E16 coordinator tells the phase 8 session, which owns and regenerates the baselines. Visual regression stays advisory (round 2 conflict 12) |
| **Wave 2 is eight PRs wide**                                                                                                                                                                                                               | File ownership is fixed in section 6; page PRs do not edit `packages/ui`; shared files have one owner. If capacity is short, run PR 4 to PR 6 first, then PR 7 to PR 9                                       |
| **Cutting content removes something a user relied on**                                                                                                                                                                                     | Most "removed" items move to a drawer or an owner page; true removals are D4 to D7 and can be reverted per PR                                                                                                |
| **Compliance** (notice restyle, estimate in the hero, MoneyHelper line, R4 debt card)                                                                                                                                                      | Defaults keep wording, visibility and placement rules intact; D2(a) and any notice collapse wait for sign-off; every page PR gets the `ui-compliance-reviewer` and a copy check against R1 to R8             |
| **Token changes shift every screen** (card edge, tints)                                                                                                                                                                                    | PR 1 lands alone in its files with before and after frames of the template stories; contrast tests keep `KNOWN_FAILURES` empty                                                                               |
| **Scores are judgement**                                                                                                                                                                                                                   | Countable criteria (P1 to P13 and `expectPageRules`) carry the simplicity axis; the visual axis is re-scored by one reviewer in PR 13 against the same frames as the audit                                   |
| **Law edits** (AGENTS.md sections 2 and 3)                                                                                                                                                                                                 | Made once, in PR 1, flagged in the PR description (round 2 conflict 2)                                                                                                                                       |
