# E15 phase 0: heuristic design critique, journeys and measured baseline

Status: evidence only. No app code was changed. Captured 2026-11-11 against `main` at `e4ff6c3` (worktree branch `claude/e15-visual-phase0-318020`), local dev servers (web `:5173`, backend `:4000`, marketing `:3001`), isolated Postgres database `flump_e15`, `AUTH_DEV_BYPASS=true`, user `dev_user_123`. No real credentials, no production URLs.

## 0. How to read this

- Screenshots: `docs/design/e15/baseline/<route>--<persona>--<width>--<theme>.png`, 1280 and 375 px, light and dark, full page. Three states captured: `new` (empty account), `typical` (Sample data: £42k salary, 2 credit cards, mortgage, pension, savings, 8 accounts) and `heavy` (owner addition: 34 accounts with long names, an overdrawn account of -£486, zero balances, 4 mortgages including 2 buy-to-let, 9 liabilities, £110k salary plus rental and freelance income, 35 budget entries across 15 categories, 64 tax records across 4 tax years). Local development database only. Section 8 covers what only shows when populated.
- Sibling E16 can reuse every image. I did not score functional value; items I noticed that are about correctness or product scope are tagged **[E16]**.
- Severity: S1 blocks or misleads, S2 clear friction, S3 polish. Nielsen scores are 1 (poor) to 5 (good), mine, from the live screens.
- Layout: the web app signs in via the dev bypass, so signed-out surfaces (`/sandbox` redirects to onboarding, login pages) were not capturable. Marketing is captured as the public site.

## 1. Headline findings (what matters most)

1. **The token system is sound; the leaks are at the call sites.** All 88 semantic text/surface/status/chart pairs I computed pass (4.5:1 text, 3:1 graphics) in light and dark. Every Lighthouse contrast failure traces to raw hex or primitives in components (`#94a3b8` on white = 2.56:1, `#6b7280` on dark surface = 3.6:1, white on `#818cf8` = 2.98:1, `#8b5cf6` on a tint = 3.64:1, `#fb2c36` on tint = 3.7:1). So the fix is adoption of the tokens (E9 and E15 Phase 3), not a new palette for contrast reasons.
2. **Visual language is inconsistent across screens, not wrong on any one screen.** Hand-written inline styles run 23 to 158 `[style]` nodes per route; there are 6 or more different card treatments, 3 icon treatments (react-icons FA and Feather mixed, emoji in the budget tabs and tax), and 2 numeral treatments (proportional Inter in cards, monospace in the mortgage panel).
3. **The brand mark fights the palette.** The neon mint square logo (about `#2af5a0` fill) sits next to indigo UI in every header and is the loudest object on every screen at 375 px.
4. **Mobile is the weakest surface.** `/app/mortgage` overflows horizontally at 375 px (document 565 px wide); dashboard KPI cards stack one per screen (4 screens to see the strip); dashboard widgets squeeze to two columns with truncated titles ("Budg…", "Savin…", "Pensi…", "Mort…"); the bottom bar has no Home or Debt (I-12); tabs clip ("Strategy…", "Savings & In…").
5. **A broken layout on the primary simulator at 1280:** on `/app/debt` the third strategy card ("Minimum Only") is cut off and overlapped by the chart panel.
6. **Empty and unknown values render as zeros.** £0/mo, 0 years, "Not calculated" are not used consistently: Mortgage shows "Remaining term 0 years", "£0/mo" and "0.0% of total cost is interest" when the term is simply unset; the new-user onboarding preview shows "£0/mo, +£0/mo, £0" before any input. This is the E2 principle (honest empties) not yet reflected visually.
7. **Colour semantics are unstable.** The dashboard shows a negative monthly surplus (-£2,254) in green and the positive Liquid cash in purple; the budget page uses indigo, amber and pink for category totals with no legend meaning; the same blue/indigo is used for links, selected states, headings and data.
8. **Good bones to keep:** one KpiStrip row of 4 on dashboard, debt, pension and forecast at 1280 (the law works); clear route error panel ("We couldn't load your data" with retry); marketing site has a clear section rhythm and honest placeholders; dark theme surfaces are genuinely layered (canvas, card, sunken) on most pages.

## 2. Measured baseline

### 2.1 Static metrics per route (typical persona, 1280 / 375; DOM measured in light)

| Route | Doc height 1280 / 375 px | Inline-styled nodes | Text under 12 px | Targets under 44 px (1280) | Horizontal overflow at 375 | Other |
|---|---|---|---|---|---|---|
| `/` dashboard | 1,636 / 2,546 (a later live read gave 1,986 px and 163 nodes, so treat as approximate) | 157 | 28 / 52 | 10 (in first view) | no | 2 console errors (dev hydration) |
| `/app/onboarding` | 915 / 1,124 | 48 | 14 | 25 | no | no `<h1>`, no document title |
| `/app/debt` | 1,517 / 3,335 | 88 | 21 / 15 | 26 | no | 3 inputs without labels |
| `/app/mortgage` | 1,014 / 2,213 | 49 | 8 | 25 | **yes** | 4 inputs without labels |
| `/app/pension` | 1,562 / 2,952 | 129 | 11 | 34 | no | |
| `/app/savings` | 1,027 / 1,714 | 127 | 30 / 15 | 26 | no | |
| `/app/forecast` | 1,051 / 2,208 | 63 | 23 / 15 | 20 | no | |
| `/app/tax` | 1,387 / 2,522 | 121 | 9 | 41 | no | |
| `/app/budget` | 1,271 / 2,432 | 99 | 6 | 22 | no | |
| `/app/accounts` | 1,855 / 2,400 | 28 | 1 | 21 | no | one card per account type, much empty space |
| `/app/profile` | 1,183 / 1,735 | 23 | 1 | 18 | no | |
| marketing `/` | 7,620 / 12,017 | 167 | n/a | n/a | no | |
| marketing `/pricing` | 1,634 / 2,708 | 18 | n/a | n/a | no | |

Notes: "targets under 44 px" counts links, buttons, inputs, selects and tab roles shorter than 44 px; the WCAG 2.2 AA floor is 24 px and only a handful of controls (1 to 6 per page) fall under that. Document title is empty on 8 of 11 app routes (`document-title` fails).

### 2.2 Lighthouse (v12, mobile profile, headless Chrome, **dev servers**)

Performance numbers are not meaningful: dev builds, unminified, fonts from Google blocking (LCP 55 to 73 s). They are recorded only so the T0.9 production-build rerun has a comparison. Accessibility and best-practices are valid.

| Page | Perf (dev) | Accessibility | Best practices | SEO | CLS | Failing a11y audits |
|---|---|---|---|---|---|---|
| marketing `/` | 46 | 96 | 100 | 92 | 0.155 | color-contrast (2) |
| marketing `/tools` | 50 | 94 | 100 | 92 | 0.106 | color-contrast (1) |
| marketing `/pricing` | 55 | **100** | 100 | 92 | 0 | none |
| web `/tools` | 32 | 95 | 96 | 92 | 0 | color-contrast (26), label-content-name-mismatch |
| web `/` | n/a | 87 | 96 | n/a | n/a | color-contrast (7), heading-order, link-name (6 icon links), label-content-name-mismatch |
| web `/app/debt` | n/a | 88 | 96 | n/a | n/a | color-contrast (7), document-title, heading-order, label (3), label-content-name-mismatch (4) |
| web `/app/mortgage` | n/a | 81 | 96 | n/a | n/a | color-contrast (15), label (3), select-name, document-title |
| web `/app/pension` | n/a | 91 | 96 | n/a | n/a | color-contrast (10), aria-progressbar-name, heading-order (2) |
| web `/app/budget` | n/a | 91 | 96 | n/a | n/a | color-contrast (29), document-title |
| web `/app/tax` | n/a | 82 | 96 | n/a | n/a | color-contrast (11), aria-allowed-attr (2), document-title |
| web `/app/profile` | n/a | 86 | 96 | n/a | n/a | color-contrast (3), aria-valid-attr-value, heading-order, document-title |
| web `/app/onboarding` | n/a | 95 | 96 | n/a | n/a | document-title |

Caveat on one result: every page also reports the `<h1>` at 1.04:1 (`#f8fafc` on `#ffffff`). The page `html` and `body` have a transparent background (the colour lives in an inner wrapper), and the dark text token is applied when the run resolves the system as dark while Lighthouse's background detection falls through to white. I could not reproduce it in a normal light or dark browser render (h1 computed `#0f172a` in light, `#f8fafc` in dark, both on correct backgrounds). Treat it as a probable false positive caused by transparent root backgrounds, but a cheap hardening (give `html` the `surface.canvas` token) removes it and the host-paint risk.

### 2.3 Token contrast matrix (computed from `packages/ui/src/tokens/index.ts`)

88 pairs, light and dark: text primary/secondary/muted and primary, positive, warning, danger, info, neutral text on canvas, card and sunken; `primary.foreground` on `primary.solid`; `text.onContrast` on `surface.contrast`; each status text on its own bg; chart, `border.input`, `border.focusRing` and solid status vs card at 3:1. **88 of 88 pass.** Script: not committed (scratch). Re-run as `tokens.a11y.test.ts` coverage in T1.8.

### 2.4 Task step counts (typical persona, from the live UI)

| Task | Steps today (clicks/taps from `/`) | Notes |
|---|---|---|
| Reach the debt plan | 1 (dashboard debt banner "Open debt payoff") | Banner shows only when debt exists. Not in the mobile bottom bar. |
| Run a mortgage overpayment scenario | 4: Wealth menu, Mortgage, tab "Overpayment simulator", move slider | Mortgage needs term entered first or the screen shows 0 years and £0. |
| Estimate tax for the year | 2 (Planning menu, Tax) then read; adding records is longer | Page opens on streams, estimate card at top. |
| First insight for a new user | Onboarding: 3 steps, step 1 has 4 fields (age, employment, salary, student loan), then Next; first personalised numbers appear in the preview strip on step 1 | The preview starts at £0 and updates as you type. Total time not measured (no analytics). |
| Add a debt (new user) | Debt (via More on mobile), "Add debt", dialog | Empty state is clear and has a CTA. |

Server round trips and seconds-to-first-number are deferred to T0.9 on a production build.

## 3. Screen-by-screen critique

Scores: V = visibility of system status, M = match with real world (copy), C = consistency and standards, E = error prevention and recovery, A = aesthetic and minimalist design. All 1 to 5.

### 3.1 Dashboard `/` (typical)
Screens: `home--typical--*`. V3 M3 C2 E3 A3.
- **Strong:** single row of four KPIs at 1280; baseline progress chip; one clear priority banner ("Stage 1: stabilise and clear", £3,500, CTA "Open debt payoff").
- S1 **Number meaning:** net worth -£142,250 (no property asset in the seed, so correct for the data) is rendered in black and large without an explanation; monthly surplus -£2,254 is coloured **green** (positive colour for a negative number) while the card reads "Available to save, invest, or overpay". **[E16]** also: "Monthly take-home £0/mo" while the profile holds £2,760 and gross £42,000/yr.
- S2 **Widget grid:** six widgets in two unequal columns leave a hole under Mortgage; widget internals use five different mini-card styles (grey inset, bordered inset, pill, plain). The "Customize Dashboard" ghost button is the only control for a layout the user may not want.
- S2 **Mobile (375):** each KPI card is about 120 px of mostly padding, so the four KPIs take about 4 screens; widgets go two-up with clipped titles and "Gross sala…" collisions ("Monthly take-home £0/mo" and "£42,000/y" overlap).
- S2 **Information density:** the page repeats net worth three times (KPI, accounts widget, baseline strip).
- S3 Brand logo block at top-left is neon green and square; the setup progress "5 / 7" pill wraps on mobile.
- Dark: same layout; surfaces layered; the red banner reads well; the green logo is the brightest element.

### 3.2 Onboarding / first run `/app/onboarding`
Screens: `onboarding--new--*`, `onboarding--typical--*`. V3 M4 C3 E3 A4.
- **Strong:** clear 3-step tabs, plain headings, quick-pick chips for age and salary, live preview strip, "~60 seconds" promise.
- S2 Preview strip shows "£0/mo / +£0/mo / £0" before input (looks like a real result). It should show a dashed placeholder until a value exists.
- S2 No `<h1>` and no document title; the steps are tab-styled buttons (look like navigation, behave like a wizard); native `<select>` styling differs from the rest of the app; chips are 24 px tall, well under 44 px touch size.
- S2 The page keeps the full site nav (Home, Budget...) during first run, offering a way out to empty screens. Home and `/sandbox` redirect new users here (good), but there is no visible "Skip for now".
- S3 Large unused vertical space below the card at 1280.

### 3.3 Debt `/app/debt`
Screens: `debt--new--*`, `debt--typical--*`. V3 M3 C2 E4 A2.
- **Strong:** empty state (new): "No debts yet" with one primary CTA is exactly the right pattern. KPI row of four, one row. Payoff strategy cards communicate trade-offs.
- **S1 layout bug (1280):** the strategy cards (Avalanche, Snowball, Minimum only) sit in a column narrower than three cards; "Minimum Only" is clipped and the chart panel overlaps it. Strategy cards stay in a three-up row in the left controls column instead of a radiogroup (J-10).
- S2 Controls are not in the SimulatorSplit pattern the law describes: the overpayment slider sits above the strategy cards in a card, and the "Impact" callout is inside the controls, while the chart sits right. At 375 the page is 3,335 px tall.
- S2 Three form controls have no label (Lighthouse), one `<h2>` after `<h1>` out of order, and the select "Projected ISA Growth Rate" is a bare native select.
- S3 Mixed icons (flame, coins, calendar-check, piggy bank) each in different tinted circles; "Year 3.3" and "Mo 36" use different time units in the same panel.
- S3 Emoji in strategy badges ("snail"). Violates the no-emoji-as-icon principle in the plan.

### 3.4 Mortgage `/app/mortgage`
Screens: `mortgage--typical--*`. V2 M3 C2 E2 A2.
- **Strong:** the amortisation breakdown (cost block plus principal/interest bar) has a clear primary figure; interest-rate and balance sliders use the compact value pill.
- S1 **Mobile overflow:** document is 565 px wide at a 375 px viewport; the tab row ("Mortgage tracker / LTV milestones / Overpayment simulator / Overpay vs save") scrolls the whole page instead of scrolling itself.
- S1 **Zero as unknown:** with no term set the screen shows "Remaining term 0 years", "Monthly payment £0/mo", "0.0% of total cost is interest", and a paragraph saying "Over the course of 0 years, you will pay a total of £0". It also shows an "Add your mortgage term" prompt above, so the screen contradicts itself. **[E16/E2 residual]**
- S2 Five-up grid in "My Mortgage Information" (5 tiles, I-09 violation; the law allows a maximum of 4); this is one of the two dark-mode surfaces that use monospaced numerals, making it feel like another product from the rest of the app.
- S2 The cost breakdown is a good candidate for KpiStrip, but the layout stacks parameters (left) and results (right) in the correct shape only for the `tracker` tab; the other three tabs use different structures.
- S2 Three unlabelled inputs and one unnamed select (Lighthouse). Slider and value pill are two controls for one value with no linking label.
- Dark: very readable; indigo on near-black cards looks good, but `white on #818cf8` selected pill fails contrast (2.98:1).

### 3.5 Pension `/app/pension`
Screens: `pension--typical--*`. V3 M3 C3 E3 A3.
- **Strong:** four-KPI strip; the chart is clear with dashed projection; good plain wording ("UK auto-enrolment").
- S2 **State clash:** two growth-rate presets are highlighted at once ("Portfolio Avg (5.0%)" and "Moderate (5%)").
- S2 Chart legend is the largest text on the chart (18 px coloured labels) and the y axis labels are 12 px muted; legend and axis do not share a style. Series colours are green and indigo; green here means "projected growth", elsewhere it means "good".
- S2 Number fields (age, horizon) are bare text inputs; "Add Pension Pot" appears twice (header and a full-width bar at the bottom).
- S3 A pill "1 active / Toggle rules" wraps onto two lines and is cramped in the "UK Tax Rules & Assumptions" row; "Sal Sacrifice" abbreviation on the dashboard widget.
- S2 Contrast: 10 failures (purple `#8b5cf6` on a tint at 3.64:1, muted greys).

### 3.6 Savings `/app/savings` and Forecast `/app/forecast`
Screens: `savings--typical--*`, `forecast--typical--*`. Savings V3 M3 C3 E3 A3; Forecast V3 M3 C3 E3 A3.
- **Strong:** the forecast page is the closest to the ideal simulator: four KPIs in one row, left parameters with compact value pills (SliderField), right chart with legend, three outcome tiles.
- S2 **Overlap [E16]:** the two pages answer the same question (compound growth of savings), with different inputs and slightly different numbers (savings 10-year total £87,665; forecast 10-year £79,936; both at 5%/2.95% AER with different bases).
- S2 Savings at 375 shows the chart legend as two long coloured lines of text with a 14 px baseline; milestone cards are a good compact pattern (2 x 3 grid with a "Reached" state).
- S3 Tab labels clip at 375 ("Savings & In…"); `Real terms (-2.5% inflation)` checkbox is a native checkbox style.
- S3 Forecast headline "Forecast and tools" is a category, not a page purpose.

### 3.7 Tax `/app/tax`
Screens: `tax--typical--*`. V3 M3 C2 E3 A2.
- **Strong:** the first card is the answer ("Estimated Self Assessment due £0.00"); fiscal-year selector and "Copy from 2025/26" are real, useful shortcuts.
- S1 **Number consistency [E16]:** "Total gross income £45,000" with "PAYE (£45,000.00)" under it, while the banner below says the profile baseline is £42,000/year. Same page, two salaries.
- S2 At 375 the page opens with a disclaimer, then a primary button, then four stacked stat cards before any content; 2,522 px tall. Accordion sections each carry a coloured icon tile; "Inline Quick-Add" and "Add Expense" and "Add Income" and "Log Payslip / Bonus" and "Copy from 2025/26" are five buttons in a row.
- S2 The tab "Tax Tra…" clips; heading-level and `aria-allowed-attr` failures; 11 contrast failures.
- S3 Amounts shown to the penny (`£45,000.00`) on this page only; elsewhere whole pounds.

### 3.8 Budget `/app/budget`
Screens: `budget--typical--*`. V3 M3 C2 E3 A2.
- **Strong:** a clear four-KPI strip, deficit tile gets danger treatment (icon, border, text), category tabs are a real navigation aid.
- S2 **Alert stacking:** the page shows, in sequence, a purple "Priority obligations" card, a green "Flexible spend" card, a grey sentence, a black-bordered "UK FCA Priority Debt Guardrail Active" box, and an amber "Upcoming bill renewals" banner. Five different treatments for five advisory messages, none ranked. The black-bordered box is the loudest object on the page and is generic guidance.
- S2 "Monthly income £0 / 0 sources" with the deficit headline: empty income is rendered as a result.
- S2 Donut at 70/21/9% is semicircular with an odd label offset; category totals are coloured indigo, amber and pink to match the donut, which is good, but the same colours have no meaning elsewhere.
- S3 Emoji used as category icons (house, lightning, credit card, piggy bank, briefcase).
- S3 Tabs: "Overview", "Runway analysis" and five category pills in a single bar.

### 3.9 Accounts `/app/accounts`
Screens: `accounts--typical--*`. V3 M4 C3 E3 A2.
- **Strong:** the page is the simplest in the app; account cards have a clear name, type and balance.
- S2 **Wasted space:** each of 6 account types (8 accounts) is a section with one or two cards in a 4-column grid; the page is 1,855 px tall and about 70% empty. A single grouped list or table with totals (assets vs owed) would be one screen.
- S2 No totals, no interest rate, no "owed" label for credit cards and mortgage (they look like assets). Liabilities need an explicit visual and wording convention.
- S3 Card pencil icon is the only affordance; "Current account / Current account" repeats; no sparkline or last-updated.
- S3 Header nav on this page shows a "Debt" item that the dashboard header (same user) does not show. **[E16]** (the nav varies between loads and pages, observed by a reviewer too: the dashboard header showed no Debt item at capture time and showed one on a later live read).

### 3.10 Profile / settings `/app/profile`
Screens: `profile--typical--*`. V3 M4 C4 E4 A4.
- **Strong:** the calmest page in the app: single column, clear card per concern, a reset at the bottom behind a danger expander, "Verified" status chip.
- S2 Page is mostly empty (the real settings live elsewhere: "Employment, Tax & Property Settings" is a link card). The Save button is far from the avatar block; no unsaved-changes indicator (I-14).
- S3 "Display Name" placeholder reads as a value; Title Case labels ("First Name", "Save Profile") against sentence case elsewhere.
- S3 The danger zone is red text on a dark red tint (the weakest contrast of the page in dark).

### 3.11 Error, empty and 404 states
Screens: `home--typical` (the route error panel, captured when the dashboard threw before I rebuilt a stale package, see section 6), `notfound--new--*`, `debt--new--*`, `accounts`, empty states in the new persona set.
- **Strong:** the route error ("We couldn't load your data", "This is usually temporary", Try again plus Go to dashboard) is clear, calm and keeps the nav.
- S2 "Go to dashboard" on the dashboard's own error is a self-link; the label should be context-aware.
- S2 404 inside the app (`/app/nope`) renders "Something went wrong" with a 404 status; a missing page is not a failure and should say so ("We can't find that page").
- S3 Empty states use a dashed container on debt (good); other screens use zeros instead.

### 3.12 Marketing home and pricing
Screens: `mkt-home--public--*`, `mkt-pricing--public--*`, `mkt-security`, `mkt-mcp`, `mkt-tools`. V4 M4 C3 E4 A3.
- **Strong:** a clear hero thesis, an "Example, illustrative figures" strip, a real live calculator, a comparison matrix, and an honest placeholder on pricing ("£X per month, placeholder price: not final").
- S2 Pricing: the lead paragraph is left-offset and not centred under the centred title (visible at 1280); the plan cards end at 960 px and the footer starts at 1,185 px (about 220 px of dead space); the monthly/annual toggle has no effect while no price exists (a control that does nothing).
- S2 Footer carries a visible "[Company name PLACEHOLDER]" line (expected until the owner supplies it) styled as orange text on a cream pill.
- S3 Home is 7,620 px at 1280 and 12,017 px at 375; the sections are well paced but the page is long for a "60 seconds" promise.
- A11y: pricing scores 100, home 96 (2 contrast failures), CLS 0.155 on home and 0.106 on tools (layout shift to fix; probably fonts).

## 4. Cross-cutting issues (feed Phase 1 to 3)

| # | Issue | Evidence | Severity | Phase that fixes it |
|---|---|---|---|---|
| X1 | Raw hex and primitives bypass tokens; contrast failures | Lighthouse: 7 to 29 colour-contrast nodes per route | S1 | Phase 3 (E9 folded in), T8.2 ratchet |
| X2 | Hand-written inline styles | 23 to 158 `[style]` nodes per route | S2 | Phase 3 |
| X3 | Mixed icon sets plus emoji | FA + Feather + emoji on budget, tax, debt | S2 | T1.7 and Phase 3 |
| X4 | Zero rendered for unknown | Mortgage 0 years, £0/mo; onboarding preview £0; budget income £0 | S1 | T2.3 Money/Num, T2.4 KpiCard empty state |
| X5 | Unstable colour meaning | Green for a deficit; purple for liquid cash; indigo as data and link | S1 | T1.6 data-viz spec, T2.3 |
| X6 | Mobile layouts stack rather than restructure | Dashboard KPIs 4 screens; widgets two-up with clipped titles; mortgage overflow | S1 | T2.8, T2.10, T6.2 |
| X7 | No page titles | 8 of 11 app routes have an empty `<title>` | S2 | any Phase 3 screen task |
| X8 | Navigation: bottom bar lacks Home and Debt; header differs by data | I-12 observed | S2 | T2.8, T3.0 |
| X9 | Overlong, unlinked advisory content | Budget page five advisory treatments | S2 | T2.6 InlineAlert/Banner, T5.1 |
| X10 | Tiny targets and text | 6 to 52 text nodes under 12 px; chips 24 px tall | S2 | T1.3, T2.1, T6.1 |
| X11 | Brand mark (neon mint) clashes with indigo | every header | S2 | D2 decision |
| X12 | Native selects and checkboxes styled differently per page | debt, onboarding, savings, profile | S3 | T2.2b |
| X13 | Strategy and mode choices are tab or button styled, not radiogroups | onboarding steps, debt strategies, pension presets (two highlighted at once) | S2 | T2.2c, T2.9 Stepper |

Audit item cross-reference: I-09 (layout laws): still open on mortgage (5-up), debt (controls above chart), onboarding; fixed on forecast. I-11 (no global progress): not observed fixed. I-12: open. I-14: open on profile. K-01 to K-07: open (legend styling, hex colours in charts). L-06 (terminology): open ("Safe to spend", "Weekly safe-to-spend", "Safe-to-Spend Allowance" appear on the dashboard). H-04 to H-06, H-11: open (see X1, X2). E2 fixes verified as holding: no invented figures in empty state; liabilities shown as positive numbers.

## 5. Journey maps (visual and UX lens; E16 owns value)

Format: stage, what happens, user thought, pain, opportunity.

### J1 First run (marketing to first insight)
| Stage | Today | Thinking | Pain | Opportunity |
|---|---|---|---|---|
| Arrive | Marketing home: "Your complete UK financial picture in 60 seconds" | "Is this for me, and is it safe?" | Page is long; "Example" strip is small | Keep the thesis; show one worked example above the fold |
| Try | Live calculator on the home page (no sign-up) | "Show me my number" | Strong; the result card is clear | Offer "save this as my baseline" without a form wall |
| Sign up | Get started to the web app (dev bypass hides this) | "How much will it ask?" | Not captured in dev | Capture in a hosted test env |
| Onboarding 1 to 3 | 3 tabs; step 1 = 4 fields; preview strip updates | "Why do you need my age?" | Preview shows £0 as if a result; no skip; full nav still shown | Placeholder state, "Skip for now", one H1, plain reason under each field |
| First insight | Dashboard with KPI strip, baseline, priority banner | "What should I do now?" | Four KPIs plus six widgets; deficit shown in green | One coach card ("next best step"), KPIs below |

Baseline: 3 steps and about 6 to 9 inputs to the first personalised number. Target (plan): 30% fewer steps.

### J2 Returning glance
Dashboard load, scan four numbers, optionally open a widget. Pain: widgets repeat net worth; mobile needs four screens of scrolling to see the strip. Opportunity: sticky compact summary at 375, one horizontal KPI strip.

### J3 Monthly review
Budget, Accounts, Home. Pain: five unranked advisory boxes on budget; accounts is 1,855 px for 8 balances; actuals not tracked ("Actual spending is not tracked yet" is a sentence, not a state). Opportunity: month-on-month change on each KPI; one ranked "needs attention" list.

### J4 Debt payoff plan
Dashboard banner or Wealth menu, Debt, choose strategy, set overpayment, read impact. Pain: strategy cards clipped at 1280; impact callout is far from the chart; avalanche/snowball choice is not a radiogroup. Opportunity: SimulatorSplitLayout, one outcome sentence above the chart ("Debt-free November 2029, £2,465 saved"), "Reset to my figures".

### J5 Mortgage overpay vs save
Wealth menu, Mortgage, four tabs, adjust sliders. Pain: 4 clicks; term missing makes the screen show 0; 565 px overflow on mobile; the "overpay vs save" tab is the decision but the last of four tabs. Opportunity: make the decision the default tab, pilot screen for the new system (D4).

### J6 Tax-year check
Planning menu, Tax, read estimate, add records. Pain: contradictory salary figures (£45,000 vs £42,000), five action buttons per section, penny precision. Opportunity: one answer card with "how we got this" disclosure; records in a drawer.

## 6. Limits of this evidence

- Three states: New, Typical and Heavy (section 8). The plan's Complex persona (Scottish taxpayer) was approximated by the Heavy state without the Scottish tax band; T0.1's persona script remains to do. Mortgage term was left unset in Typical on purpose (it is what a real user who skipped it sees) and in Heavy too.
- Dev bypass only: signed-out web surfaces (`/sandbox`, login, signup) were not captured; `/tools` was.
- Lighthouse performance is on dev servers and not valid; rerun on production builds (T0.9).
- Environment note: the first dashboard capture returned a 500 because this worktree's `packages/finance-engine/dist` was stale (missing `isHighInterestDebt`); I rebuilt that package (a git-ignored build output) and recaptured. Not an app bug on main, but it shows that `bun run dev` needs the engine built first.
- One backend finding while seeding: `POST /accounts` returns a bare 500 when `currency` is omitted (database null constraint). **[E16/E6]**
- Storybook was not run (storybook MCP not connected; time). Story-level a11y was not measured.

## 7. Review

A Sonnet reviewer checked about 40 claims against the screenshots and live app: all confirmed except the four corrections applied above (6 account types not 7, placeholder styling, a wrapped not truncated pill, dashboard row approximate). Not independently re-verified by the reviewer: Lighthouse scores, the 88-pair token matrix (my own computation), and the 375 px tab clipping on savings and tax (seen in my screenshots).

## 8. Populated state (heavy data): issues that only appear with real volume

Screens: `*--heavy--*` (10 routes, 1280 and 375, light and dark). Seeded locally by API into database `flump_e15`: 34 accounts, 26 of them added in bulk with long names, -£486 overdrawn current account, £0 balances, £565,000 home value, 4 mortgages, 9 liabilities (credit cards including a 0% promo and a 39.9% overdraft, student loan, car finance, family loan), £110,000 salary plus rental and freelance income, 15 budget categories, 64 tax records across 2023/24 to 2026/27. Load times on the dev server stayed 0.7 to 0.9 s for every route, so no performance problem is visible at this volume (dev server, local database, not a production measure).

### 8.1 Measured (heavy; 1280 / 375)
| Route | Doc height | Elements clipped with ellipsis | Horizontal overflow at 375 | Inline styled nodes | Table rows in DOM |
|---|---|---|---|---|---|
| `/` | 1,505 / 2,331 | 0 / 6 | no | 115 | 0 |
| `/app/debt` | 1,557 / 3,425 | 0 / 0 | no | 152 | 10 |
| `/app/mortgage` | 1,014 / 2,213 | 0 / 0 | **yes (565 px)** | 49 | 0 |
| `/app/pension` | 1,516 / 2,908 | 0 / 0 | no | 182 | 5 |
| `/app/savings` | 1,027 / 1,714 | 0 / 0 | no | 262 | 16 |
| `/app/forecast` | 1,413 / 2,933 | 0 / 0 | no | 85 | 0 |
| `/app/tax` | 1,482 / 3,018 | 0 / 0 | no | **538** | 41 |
| `/app/budget` | 2,130 / 3,415 | 0 / 0 | no (but tab bar clips) | 194 | 0 |
| `/app/accounts` | **2,648 / 7,043** | **14 / 12** | no | 56 | 0 |
| `/app/profile` | 1,183 / 1,735 | 0 / 0 | no | 23 | 0 |

### 8.2 Findings that only appear populated
- **S1 Accounts does not scale.** 34 accounts take 2,648 px at 1280 and 7,043 px at 375, in 8 type sections, with no search, sort, filter, totals per group or assets-versus-owed split. Long names truncate with an ellipsis ("Joint household current acco…", "Business float - Gallagher & P…", "Marcus by Goldman Sachs 1-Y…") and the full name is not shown anywhere (14 truncated at 1280). The type grid leaves a lonely card in many rows.
- **S1 Overdrawn and owed are not distinguished.** The overdrawn account shows "-£486" in the same black as every other balance with no "Overdrawn" cue. Credit cards, mortgages and loans display as plain positive numbers in the same card style as assets, so a £318,500 mortgage looks like a £318,500 asset.
- **S1 Totals disagree between screens for the same data.** Weekly safe-to-spend is £207 on the dashboard and £1,384 on budget. Estimated tax due is £127,482 on the dashboard widget and £0.00 on the tax page KPI. The tax KPI "Total gross income £45,000 (PAYE £45,000)" appears for both the £42,000 and the £110,000 profile, so it is a hard-coded fallback (the open E2 ledger follow-up: `5/3/45000`). The same tax page's table shows £440,000 for the PAYE section. **[E16 / E2 residual]**
- **S1 Wrong categories inflate headline numbers.** "Liquid cash and buffer £1,227,958 (instant emergency liquidity)" and "Total savings and investments £1,227,958" include the £565,000 home, two £210,000 flats and a £38,000 car (all account type "Investment"), so the dashboard calls property liquid. Portfolio weighted AER is shown as 0.31% (the £3,942 annual interest estimate follows from that) because zero-rate property is in the average. The mortgage widget sums four mortgages (£765,500, including buy-to-let) with one 4.60% rate and still shows "Add your rate and term". **[E16]**
- **S2 Budget breaks at 15 categories.** The donut has 15 slices and a 15-item legend; purple is reused for travel, education, charity, food and personal, so slices cannot be told apart by colour (K-08, cap at 6 plus Other). Category tabs run off the right edge ("Health" is cut off) with no scroll affordance. Custom categories get a generic folder emoji. The category list is unsorted (housing first, not largest first) and the left chart card stretches to the list height, leaving roughly 900 px of empty card. Four KPI cards and five advisory boxes still sit above all of this.
- **S2 Charts at scale.** Savings: the y axis starts at £0 on a £1.2m balance, so both series are nearly flat and indistinguishable (dashed lines overlap); the axis reads "£1800k, £1350k" instead of £1.8m (K-07); all six milestones read "Reached", a wasted row. Debt payoff: nine liabilities collapse to two curves; the crossover bridge is clear, but "Mo 106" against "Year 4" mixes units. Accounts widget: six type chips then "+1 more" cut the account story off on the dashboard (34 active accounts).
- **S2 Debt: the clipped strategy card persists** (Minimum Only is cut off) and the KPI row gives "£31,200 at >6.5% APR" without a link to the nine liabilities behind it.
- **S2 Tax table density is acceptable but unscannable.** Each source section is an accordion (good, follows the no-uncollapsed-schedule law); inside, four identical salary rows (an artefact of the seed repeating annual records) show full-precision currency to the penny and two icon-only actions per row. Inline styles reach 538 nodes on this route (the largest of any). The yearly tabs are clear.
- **S2 Mobile at volume.** Accounts at 375 is 7,043 px (about 9 screens); six elements on the dashboard are ellipsis-clipped (widget titles and labels); budget tabs clip; mortgage still overflows at 565 px. Dark theme behaves like light in all of these.
- **S3 Good under load:** the dashboard KPI strip holds at £1,227,958 without wrapping at 1280; the fiscal-year selector is a clear way to handle four tax years; the budget list rows are consistent and readable; dashboard accounts bar still reads at 34 accounts.
- **Mortgage with several mortgages:** the page still shows only the single mortgage-account selector and unchanged figures, so it does not reflect a household with four mortgages (residential plus buy-to-let tab exists but term and rate were unset). **[E16]**

### 8.3 What the populated state means for the directions
Any direction has to work with: group totals and an assets-versus-owed split on the accounts page; full-name disclosure for truncated labels; "Overdrawn" and "Owed" as words plus a non-colour cue; compact currency (£1.2m) on axes; a sorted bar list instead of a donut above 6 categories; "Show all N" patterns for lists and schedules; and one tolerant KPI size that still fits £1,227,958 and -£142,250 in a single row at 1280. The three mockups include a "Heavy data" frame covering these (see the direction pack).
