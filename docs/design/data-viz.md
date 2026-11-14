# Data visualisation rules (E15)

Helpers live in `packages/ui/src/charts/` (plain TypeScript, no recharts), the palette story is `1. Foundations/Data visualisation palette`, and token values and measurements are in [`e15/tokens.md`](./e15/tokens.md).

## Rules

The same rules are exported as `CHART_RULES` from `@repo/ui`.

1. **Legend for two or more series.** Or a direct label on every series.
2. **Never colour alone.** Each series also gets a dash, a marker or a direct label. Forecast lines (`chart.projection`) are always dashed.
3. **Gradients stay faint.** Area fills reach at most 0.15 opacity at their strongest point, and fade to transparent. Confidence bands use `chart.band`, a fill behind lines, never a line.
4. **Donut and pie: at most 5 slices.** Group the tail into "Other" with `capSeriesWithOther(items)`, which defaults to `CHART_RULES.donutMaxSlices` (the result has at most 5 slices including "Other"). The cap was 6 until the owner ruling of 2026-11-14 (UX assessment decision U6), which follows UK Government Analysis Function guidance. No donut where a ranked list already shows the split (P10.8).
5. **Colour identifies the entity, not the outcome.** An account, asset or scenario keeps its colour wherever it appears. Good or bad is shown by text, icon and the `status.*` tokens, not by switching a bar from one series colour to another. Liabilities use amber (`chart.debt`), never red; red is reserved for errors.
6. **Unknown is "Not set".** Never plot or print `0`, `NaN` or an empty cell for a missing figure.
7. **Honour reduced motion.** Use `useChartAnimation({ isDragging })`: it is false under reduced motion and while dragging a slider that redraws the chart.
8. **Text alternative.** Give each chart a `role="img"` and `aria-label` summary, or a data table in a `CollapsibleDrawer` (K-05).

## Colour in code

```ts
import { chartColor, seriesColor } from "@repo/ui";

chartColor("wealth"); // "var(--colors-chart-wealth)"
chartColor("accentPurple"); // "var(--colors-chart-accent-purple)" (camelCase roles become kebab-case)
seriesColor(i); // series1..series8, cycling
```

`chartColor` is for SVG attributes and chart libraries that cannot take Panda style props. The variables switch with the theme, so one set of values works in light and dark. In Panda recipes, use the token names directly (`stroke: "chart.series1"`). Roles: `primary`, `wealth`, `debt`, `warning`, `accentPurple`, `accentCyan`, `grid`, `series1`..`series8`, `projection`, `band`, `baseline`. A test checks every role against Panda's generated variable names.

### Colouring by entity

Assign a colour to an entity once (for example by its position in a stable, sorted list of accounts), and reuse it across the page, the legend and tooltips. Do not recolour on filter, hover or sort. `series1..8` are ordered so adjacent pairs stay distinguishable under colour-vision deficiency; non-adjacent warm pairs (3 and 7) can look alike, which is why markers, dashes and labels are required.

## Axes and numbers

- `formatAxisCurrency(value)` gives compact en-GB GBP: `£1.2m`, `£800k`, `-£3.4k`, `£0`, `£1.5bn`. It rounds up across unit boundaries (`999_950` is `£1m`). It returns `""` for `NaN` or infinite input, so an axis tick renders nothing rather than a wrong figure. For a standalone value use the "Not set" rule instead.
- Axis, legend and tooltip numbers use `fontVariantNumeric: "tabular-nums"`. Tooltips and axis labels use the numeric textStyles (`numeric.sm` or `numeric.md`), not body text.
- Gridlines use `chart.grid`, reference lines (targets, zero, prior year) use `chart.baseline`.

### Assumptions caption pattern

Any projected line or band gets a caption under the chart stating the assumption in sentence case: "Assumes 5% annual growth. Figures are illustrative." Put the rate in the caption in tabular numerals, and repeat it in the legend entry for the projection ("Projection (assumes 5%)").

## Relevance of the audit findings (K-01 to K-14)

| Finding                                               | How these rules address it                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| K-01 hardcoded hex series colours                     | `chartColor` and `seriesColor` replace hex; `chart.*` tokens are the only source. |
| K-02 colour-only series identity, red/green pairs     | Rules 1, 2 and 5; markers and dashes in the palette story.                        |
| K-03 colour used for outcome                          | Rule 5.                                                                           |
| K-04 static `DebtToWealthChart`                       | Out of scope here; use `chartColor` once it draws real data.                      |
| K-05 no text alternative, hover-only detail           | Rule 8.                                                                           |
| K-06 axis and grid fall back to defaults in dark mode | `chart.grid`, `chart.baseline`, `axisText` (token colour).                        |
| K-07 inconsistent axis and tooltip formats            | `formatAxisCurrency` plus numeric textStyles.                                     |
| K-08 unbounded donut categories                       | Rule 4, `capSeriesWithOther`.                                                     |
| K-09 animation left on                                | Rule 7, `useChartAnimation`.                                                      |
| K-10 mobile bars clamp small values and drop the sign | `formatAxisCurrency` keeps the sign; sizing is a mobile follow-up.                |
| K-11, K-12 chart-type fit, empty/loading/error states | Not covered by these helpers.                                                     |
| K-13 recharts bundle cost                             | The helpers are framework-free, so they add no chart library weight.              |
| K-14 teaser labelled as a real result                 | Assumptions caption pattern.                                                      |

## Measured contrast and colour-vision deficiency

Copied from [`e15/tokens.md`](./e15/tokens.md). Graphics need 3:1 (WCAG SC 1.4.11). "All 5 surfaces" is card, canvas, sunken, subtle, overlay.

| Key              | Light min (card, canvas) | Light min (all 5) | Dark min (card, canvas) | Dark min (all 5) |
| ---------------- | -----------------------: | ----------------: | ----------------------: | ---------------: |
| chart.series1    |                     5.92 |              5.43 |                    6.37 |             5.81 |
| chart.series2    |                     4.06 |              3.73 |                    8.27 |             7.53 |
| chart.series3    |                     3.43 |              3.14 |                    8.13 |             7.41 |
| chart.series4    |                     4.54 |              4.16 |                    7.60 |             6.93 |
| chart.series5    |                     5.05 |              4.62 |                    8.41 |             7.66 |
| chart.series6    |                     5.95 |              5.46 |                    6.27 |             5.71 |
| chart.series7    |                     4.88 |              4.47 |                    6.85 |             6.24 |
| chart.series8    |                     4.65 |              4.26 |                    6.26 |             5.71 |
| chart.primary    |                     5.92 |              5.43 |                    6.37 |             5.81 |
| chart.wealth     |                     4.06 |              3.73 |                    8.27 |             7.53 |
| chart.debt       |                     3.43 |              3.14 |                    8.13 |             7.41 |
| chart.warning    |                     4.88 |              4.47 |                    6.85 |             6.24 |
| chart.projection |                     5.52 |              5.06 |                    6.66 |             6.07 |
| chart.baseline   |                     3.50 |              3.21 |                    3.86 |             3.52 |

`chart.band` is a fill: its composited difference from the card is at least 1.1:1, and `chart.primary` stays at least 3:1 on it. Adjacent-series CVD (Machado full severity, CIE76 deltaE, threshold 15), minimum across adjacent pairs:

| Theme | Protanopia       | Deuteranopia     | Tritanopia       |
| ----- | ---------------- | ---------------- | ---------------- |
| Light | 39.3 (series5-6) | 17.6 (series5-6) | 28.3 (series4-5) |
| Dark  | 27.0 (series4-5) | 17.9 (series4-5) | 27.7 (series6-7) |

`chart.projection` differs from `series8` only by being dashed.
