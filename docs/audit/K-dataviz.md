# Track K - Data visualisation

Method: static reading of every chart component, using the `dataviz` skill checklist (form fit, semantic colour, colour-blind safety, marks, labels, legend, a11y, states, motion). No browser, no screenshots, no palette validator run, no bundle analysis beyond the Phase 0 numbers. Product code untouched.

## Chart inventory (11 charts, 9 recharts and 2 custom)

| Chart                       | File                                                                   | Form                                                  | Notes                                                |
| --------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| Account balance area        | `apps/web/app/components/charts/AccountDetailChart.tsx`                | single-series area (card sparkline, and axis version) | hex `#6363F1`, no empty guard inside (callers guard) |
| Savings forecaster (page)   | `components/forecast/SavingsForecaster.tsx:550`                        | 2-series overlapping area                             | custom HTML legend, solid vs dashed                  |
| Savings forecaster (card)   | `components/savings/SavingsForecasterCard.tsx:356`                     | 2-series overlapping area                             | recharts `Legend`, both lines dashed                 |
| Pension forecaster          | `components/pension/PensionForecasterCard.tsx:1097`                    | stacked area                                          | both dashed, custom tooltip with hex text            |
| Debt-to-wealth bridge       | `components/debt/DebtToWealthBridgeCard.tsx:170`                       | 2-series overlapping area                             | no legend, no dash, red vs green                     |
| Overpayment simulator       | `components/mortgage/OverpaymentSimulator.tsx:379`                     | 2-series area                                         | no legend                                            |
| Overpay vs save             | `components/mortgage/OverpayVsSaveCompare.tsx:487`                     | 2-bar stacked column                                  | red/green changes with result                        |
| UK tax pie                  | `components/forecast/UKTaxCalculator.tsx:584`                          | donut, 2 to 5 slices                                  | custom legend, table beside it                       |
| Budget expense pie          | `components/budget/BudgetDashboard.tsx:837`                            | donut, N slices                                       | custom legend with %, centre total                   |
| Debt-to-wealth (UI package) | `packages/ui/src/patterns/DebtToWealthChart/DebtToWealthChart.tsx:122` | hand-drawn SVG                                        | static paths, see K-04                               |
| Marketing micro-diagram     | `apps/marketing/src/components/FeaturePillars.tsx:131`                 | SVG 2-path                                            | illustrative                                         |
| Mobile balance bars         | `apps/mobile-companion/src/screens/AccountDetailScreen.tsx:256`        | 6 bars in RN views                                    | see K-10                                             |

No sparklines exist in `KpiStrip`. `InteractiveFinancialTeaser` (marketing) has no chart. `chartTheme.ts` is the only shared chart helper and only covers tooltip styles.

## Findings

### [K-01] Every chart hardcodes hex series colours; the `chart.*` tokens have no consumers in the web app

- Severity: P1
- Location: `AccountDetailChart.tsx:50-51,102` (`#6363F1`); `SavingsForecaster.tsx:521,537,557-562,589,598`; `SavingsForecasterCard.tsx:360-365,397,407`; `PensionForecasterCard.tsx:1101-1106,1138,1141,1156,1166`; `DebtToWealthBridgeCard.tsx:174-179,207,217`; `OverpaymentSimulator.tsx:383-388,415,424`; `OverpayVsSaveCompare.tsx:515`; `UKTaxCalculator.tsx:101-117`; `BudgetDashboard.tsx:111,160`; `FeaturePillars.tsx:128,150`
- Evidence: all strokes, gradient stops and pie cell fills are literals (`#10B981`, `#ef4444`, `#6363f1`, `#F59E0B`, `#8B5CF6`, `#3B82F6`). Tokens `chart.primary|wealth|debt|warning|accentPurple|series1..5` exist (`packages/ui/src/tokens/index.ts:245-257`) with distinct dark values (`indigo.400`, `success.400`, `destructive.400`). The only chart that uses them is the packages/ui SVG (`DebtToWealthChart.tsx:112-141`). Recharts accepts `var(--colors-chart-wealth)`; `OverpayVsSaveCompare.tsx:509` already uses `var(--colors-primary)` as a fill, proving it works.
- Impact: charts use the light-mode green and red in dark mode, which is the AGENTS.md section 2 violation. Brand and dark-mode changes cannot reach them, and legend text and tooltips (`PensionForecasterCard.tsx:1138,1141`) use the same hex as the line. Overlaps H-03/H-04.
- Recommendation: create `chartColors.ts` next to `chartTheme.ts` exporting `var(--colors-chart-*)` strings and one gradient helper; replace all literals. Do this first, since the other findings build on a shared theme.
- Effort: M

### [K-02] Series identity is colour-only or colour-plus-unlabelled-dash in several charts; red/green pairs

- Severity: P1
- Location: `DebtToWealthBridgeCard.tsx:204-222` (no legend, no dash); `OverpaymentSimulator.tsx:411-428` (no legend; dash only); `OverpayVsSaveCompare.tsx:507-518` (no legend); `UKTaxCalculator.tsx:100-118` (pie hue only, with legend)
- Evidence: `grep Legend` returns nothing for `OverpaymentSimulator`, `OverpayVsSaveCompare`, `DebtToWealthBridgeCard`. In the debt bridge the two areas differ only by `#ef4444` vs `#10b981` at 0.8 gradient opacity. These are the standard deuteranopia-confusable pair. Series are named only in the tooltip, which is hover-only. The skill's rule is a legend for 2+ series and never colour alone.
- Impact: roughly 1 in 12 men cannot reliably tell which area is debt and which is wealth, and touch users never see the tooltip. This is the headline visual of the debt and mortgage pages. (WCAG 1.4.1.)
- Recommendation: add a legend (recharts `<Legend>` or the existing custom legend pattern from `SavingsForecaster.tsx:508-546`) to every multi-series chart, and add a non-colour cue (dash on one series, or direct end-labels). Prefer `chart.primary` plus `chart.warning`/`chart.accentPurple` or a lightness-separated pair over red/green for neutral comparisons.
- Effort: M

### [K-03] Semantic colour misuse: red used for a good outcome, and the colour of a bar changes meaning

- Severity: P2
- Location: `OverpayVsSaveCompare.tsx:513-518`; `OverpaymentSimulator.tsx:413-424`
- Evidence: the second stacked bar is "Interest Saved" filled `#ef4444` when overpaying is better, and `#10B981` for "Interest Earned (Net)" otherwise. Saved interest is a benefit but is coloured as debt/danger. In the area chart "Standard Plan" is red and "With Overpayment" green, while the same plan in the bar chart is red.
- Impact: the same colour means "better" in one chart and "worse" in the next; red on a positive result undermines the status-colour rule (status colours reserved, with icon and label).
- Recommendation: colour by entity, not by outcome: principal = `chart.primary`, benefit = `chart.wealth` in both branches; reserve `chart.debt` for balances owed.
- Effort: S

### [K-04] packages/ui `DebtToWealthChart` ignores its `data` prop and draws a static picture

- Severity: P2
- Location: `packages/ui/src/patterns/DebtToWealthChart/DebtToWealthChart.tsx:26,33-34,126-141,151-156`; consumer `apps/web/app/features/sandbox/components/SandboxTemplates/SandboxTemplates.tsx:71-75`
- Evidence: the destructure is `data: _data = defaultPoints`, so `_data` is never read; the paths are literal `M 10 20 L 120 60 ...` with a crossover fixed at x=250. The consumer passes `debtFreeYear={1.5}`, `monthlyOutflow={515}` and `wealthAccumulatedFiveYrs={34500}`, so the stats say year 1.5 and £34,500 while the picture always shows the default crossover at month 24 and no axes or values. `£{monthlyOutflow}/mo` (line 69) is not locale-formatted.
- Impact: a chart that looks like data but is decoration, in the shared library, with mismatched numbers. It has a `<title>` (the only chart with a text alternative) but conveys nothing numeric.
- Recommendation: either compute the paths from `data` (simple linear scale) or rename and document it as an illustration and drop the `data` prop; format the number with `toLocaleString("en-GB")`.
- Effort: M

### [K-05] No chart has a text alternative or data table; hover-only detail

- Severity: P2 (cross-ref J-11)
- Location: all recharts files listed above; `FeaturePillars.tsx:132-139`
- Evidence: no `role="img"`, `aria-label`, `<figcaption>`, or table around any recharts container. Tooltips are the only way to read exact values. `FeaturePillars` nests `role="img"` on a div (line 132) around an svg that also has `role="img"` (line 140): the inner label is duplicated. I did not test whether recharts 3's `accessibilityLayer` default gives keyboard tooltip access.
- Impact: screen reader users get nothing from the product's primary outputs; keyboard and touch users cannot read exact values.
- Recommendation: a shared `<ChartFigure title summary>` wrapper (figure plus visually hidden summary sentence with the headline numbers), plus a "View as table" `CollapsibleDrawer` (already required for long schedules by AGENTS.md section 3) fed from the same `chartData`.
- Effort: M

### [K-06] Axis and grid colours fall back to recharts defaults in four charts (dark-mode legibility)

- Severity: P2
- Location: `SavingsForecaster.tsx:565-578`; `OverpaymentSimulator.tsx:391-404`; `DebtToWealthBridgeCard.tsx:182-193` (no axis `stroke`, `CartesianGrid` has no stroke); `OverpayVsSaveCompare.tsx:494` (X axis); `SavingsForecasterCard.tsx:368` and `PensionForecasterCard.tsx:1109` (grid has no stroke, only opacity)
- Evidence: only `AccountDetailChart`, `SavingsForecasterCard` and `PensionForecasterCard` set `stroke="var(--colors-text-muted)"` on axes. The others leave recharts' default tick colour (grey `#666`, from the library defaults; I did not render it). Against the dark card that is about 3:1 by my estimate, below 4.5:1 for 11px text; `chart.grid` token exists but is unused. `chartTheme.ts` has no axis or grid constants.
- Impact: axis labels are hard to read in dark mode on the three simulator charts.
- Recommendation: add `chartAxisProps` and `chartGridProps` to `chartTheme.ts` (muted text token, `chart.grid`) and spread them into every chart.
- Effort: S

### [K-07] Axis and tooltip number formatting is inconsistent and not compact-aware

- Severity: P2
- Location: `` `£${val / 1000}k` `` at `SavingsForecaster.tsx:577`, `OverpaymentSimulator.tsx:403`, `OverpayVsSaveCompare.tsx:499`; `PensionForecasterCard.tsx:1114-1116`; `DebtToWealthBridgeCard.tsx:192`; `SavingsForecasterCard.tsx:373-375`; `AccountDetailChart.tsx:75`
- Evidence: three different tick formatters. The `val / 1000` version gives `£0.5k`, `£1.25k` for small values and `£1500k` for £1.5m (no `m` branch; only the pension chart has one). Hard-coded `£` in all but `SavingsForecasterCard` (uses `symbol`). `AccountDetailChart` uses full `formatCurrency` on ticks, which is wide and clips with `left: -10`. Tooltips use `useFormatCurrency` (good), but the pension tooltip builds markup by hand (`:1118-1148`) with no `fontVariantNumeric`; none of the chart tooltips or ticks sets `tabular-nums` (AGENTS.md section 2). `BudgetDashboard.tsx:860` tooltip returns `["£x/mo", ""]`, leaving a stray separator.
- Impact: ragged axes, wrong magnitude labels for mortgage-size and pension-size values, and the tabular-nums law is unmet in charts.
- Recommendation: one `useCompactCurrency()` / `formatAxisCurrency(value, symbol)` helper built on `Intl.NumberFormat("en-GB", { notation: "compact", style: "currency", currency, maximumFractionDigits: 1 })`; one shared tooltip content component with tabular nums.
- Effort: S

### [K-08] Donut charts: unbounded category count, repeated fallback colour, pie for part-to-whole with many parts

- Severity: P2
- Location: `BudgetDashboard.tsx:106-112,837-851`; `apps/web/app/types/budget.ts:72-78,104-111` (`CUSTOM_PALETTE`); `UKTaxCalculator.tsx:98-120,584-620`
- Evidence: budget categories come from user-defined custom categories, each coloured by a string hash into `CUSTOM_PALETTE` (so two categories can collide and colour is not stable across renames); base colours include `#6363f1` and `#3b82f6` (two blues) and `#10b981`/`#ef4444`-adjacent hues. There is no cap or "Other" fold, so with 8+ categories the donut is unreadable. A legend and percentages exist (a good practice), and the tax pie has a table beside it (the `td` colours at `UKTaxCalculator.tsx:518-556` repeat the hex). The centre text is a good direct label. Tax pie compares 2 to 5 parts of one salary; a single horizontal stacked bar would read exact proportions better.
- Impact: indistinct slices and no alternative encoding for users with colour-vision deficiency beyond the legend order.
- Recommendation: cap at 6 to 8 categories and fold the rest into "Other"; colour from `chart.series1..5` plus neutrals; sort slices by size; consider a ranked horizontal bar list (the category cards already exist beside it) in place of the donut.
- Effort: M

### [K-09] Motion: animation left on for pie, bar, pension and account charts; global reduced-motion CSS likely does not cover recharts

- Severity: P3
- Location: `isAnimationActive={false}` is set in only 4 files (`DebtToWealthBridgeCard`, `SavingsForecaster`, `OverpaymentSimulator`, `SavingsForecasterCard`: 2 hits each). Not set in `PensionForecasterCard.tsx:1151-1170`, `AccountDetailChart.tsx:98`, `OverpayVsSaveCompare.tsx:507`, both pies.
- Evidence: A global `prefers-reduced-motion` rule exists in `apps/web/app/index.css:137-145`, but it only zeroes CSS animation and transition durations; recharts animates through JavaScript (not verified at runtime), so that rule most likely does not reach the charts, and there is no `reducedMotion` handling in the chart code. The pension chart is the one redrawn on every slider tick, so it animates continuously while dragging.
- Impact: re-animating on each input change feels laggy, and users with vestibular settings get no opt-out (WCAG 2.3.3 AAA, best practice).
- Recommendation: a `useChartAnimation()` hook returning `isAnimationActive` false when `matchMedia("(prefers-reduced-motion: reduce)")` matches, and always false for slider-driven charts.
- Effort: S

### [K-10] Mobile balance bars clamp small values and drop the sign

- Severity: P2
- Location: `apps/mobile-companion/src/screens/AccountDetailScreen.tsx:186-200,263-277,546-553`
- Evidence: bar height is `Math.max(8, abs/max*100)` percent, so any balance under 8% of the maximum is drawn at 8%; `Math.abs` removes negatives. The scale is zero-based (good), the value label is above each bar (good), and each bar has a month label. Liability bars use `rgba(239,68,68,0.4)` with a 1px border (hex literal, low-contrast fill); asset bars use `indigo[600]` from the theme. The bars have no accessibility label (no `accessibilityLabel` on the row), so VoiceOver reads value and month as separate texts, in an order that is value then label.
- Impact: a near-zero or negative balance month looks like a small positive one; mildly misleading for a financial chart.
- Recommendation: remove or lower the clamp and show negatives below a zero line (or document that the chart is magnitude only and title it so); add a combined `accessibilityLabel` per bar; use the theme tokens.
- Effort: S

### [K-11] Chart-type fit and expression issues in the forecasters

- Severity: P3
- Location: `SavingsForecasterCard.tsx:393-411`; `PensionForecasterCard.tsx:1151-1170`; `SavingsForecaster.tsx:585-603`
- Evidence: (a) Savings card draws both series dashed, so dash cannot distinguish them, and the "Total Forecast" projection and "Contributions" series overlap as filled areas where the stack relationship (contributions plus growth equals total) would be clearer stacked, as the pension chart does. (b) Pension chart is stacked (`stackId="1"`) with both outlines dashed; the tooltip handles the sum, but the legend labels are long ("Cumulative Contributions (Projected)"). (c) The page-level forecaster uses solid vs dashed with a manual legend, the best pattern in the repo, but the legend swatch for the dashed series is `borderTop: 3px dashed` on a 16px span, which renders as a plain line when `height: 3px` and `border-top: 3px` stack; I did not render it. (d) All three area charts use gradient fills from 0.4 to 0.05 opacity; the skill's rule is thin marks with solid, low-opacity fills, so this is minor. No chart shows an uncertainty band or states the return assumption on the chart itself (it is in the controls).
- Impact: low; mainly consistency.
- Recommendation: standardise on stacked area for part-to-whole (contributions plus growth) and line-plus-dash for scenario comparison; state "assumes X% return" in the chart caption.
- Effort: S

### [K-12] No empty, loading or error states inside the chart components

- Severity: P3
- Location: `PensionForecasterCard.tsx:1098`, `SavingsForecasterCard.tsx:357`, `OverpaymentSimulator.tsx:380`, `DebtToWealthBridgeCard.tsx:171` (always render the chart); `AccountDetailChart.tsx:30`
- Evidence: callers guard the cases I checked (`AccountsCard.tsx:259-262` renders the chart only if `accountDetailYear.length`; `AccountDetails.tsx:247-259` has an empty message; budget pie has "No expense data yet" at `BudgetDashboard.tsx:~928`). The forecasters take inputs with defaults so are never empty. `DebtToWealthBridgeCard` with zero debts gives a one-point or zero chart without a message, which I did not run. No chart has a loading skeleton or error fallback; they sit under route loaders, so this may be acceptable.
- Impact: low; edge cases only.
- Recommendation: if the shared `ChartFigure` from K-05 is built, give it `empty` and `error` slots.
- Effort: S

### [K-13] Recharts bundle cost (301 KB chunk) is paid by routes that need it, but nothing is lazy-loaded

- Severity: P3
- Location: `apps/web/package.json:35` (`recharts 3.10.1`); Phase 0 baseline (`CategoricalChart` 301 KB in `apps/web/build/client`)
- Evidence: a grep for `lazy(` and `ClientOnly` in `apps/web/app` found none. `d3-shape` is also imported directly in `AccountDetailChart.tsx:1` (extra dependency for a curve that recharts offers as `type="monotone"`). React Router code-splits by route, so the chunk is probably only loaded on routes with charts, but the dashboard (AccountsCard, which embeds `AccountDetailChart`) is the landing route. I did not run a bundle analyser, so the route-to-chunk mapping is unverified.
- Impact: about 100 KB gzipped (my estimate, unmeasured) on the first screen for sparklines.
- Recommendation: check with `rollup-plugin-visualizer`; lazy-load the chart components below the fold, or replace the dashboard sparkline with a small SVG path (about 30 lines). Drop `d3-shape` for `type="monotone"`.
- Effort: M

### [K-14] Marketing teaser micro-diagram is illustrative but labelled as a real result

- Severity: P3
- Location: `apps/marketing/src/components/FeaturePillars.tsx:131-153`
- Evidence: "-£1,420 interest saved" with fixed paths; the label `#10b981` on `--colors-surface-subtle` (low contrast, about 2.5:1 on white, matches J-01 computed values); the muted dashed "Minimum" line has no label, and neither line is named in the figure (only in the aria-label). No "illustrative example" note.
- Impact: a marketing claim presented as a chart of results; legibility and honesty polish.
- Recommendation: add "Example" text, label the two lines, use `status.positive.text` for the figure.
- Effort: S

## Positives (worth keeping)

- `isAnimationActive={false}` and `chartTooltipContentStyle` are used by the simulator charts; the shared tooltip theme is token-based (with fallbacks).
- Tooltips use `useFormatCurrency`, so en-GB currency is right where it appears.
- The page-level `SavingsForecaster` has a manual solid/dashed legend, the right multi-encoding approach.
- The budget donut has a legend, percentages and a centred total; the tax pie has a table of the same values.
- Only one dual-axis risk checked: no chart uses two Y axes.
- Charts are inside `ResponsiveContainer` with fixed heights (220 to 360), so they reflow; I did not test at phone width, and the 5-item tax legend wraps with `flexWrap`.

## Limits

No browser or screenshot pass, no real palette validation (colours reasoned from token names and J-track contrast numbers), no screen reader test, no bundle analysis, no runtime test of recharts 3 defaults (`accessibilityLayer`, tick colour, reduced motion). Marketing pages other than `FeaturePillars` have no charts that I found by grep for svg, polyline and recharts; the Astro `.astro` files were included in the search.

## Quick wins

1. Add `chartColors.ts`, `chartAxisProps`, `chartGridProps` to `chartTheme.ts` and replace hex (K-01, K-06). Half a day.
2. Add legends to `OverpaymentSimulator`, `OverpayVsSaveCompare`, `DebtToWealthBridgeCard` (K-02). 1 hour.
3. Make "Interest Saved" use the wealth colour in the bar chart (K-03). 10 minutes.
4. One `formatAxisCurrency` helper with compact notation (K-07). 1 hour.
5. `useChartAnimation()` hook, and disable animation on slider-driven pension chart (K-09).
6. Wrap each chart in `role="img"` with an `aria-label` carrying the headline numbers (K-05 first step).
