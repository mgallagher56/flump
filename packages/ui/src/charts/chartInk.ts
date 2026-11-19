/**
 * This file and `chartColor` (chartColor.ts) are the only places allowed to write
 * `var(--colors-*)`: chart libraries and SVG attributes cannot take Panda style props. Panda emits
 * `--colors-<token-path-with-dashes>` for semantic tokens (confirmed in the Storybook screenshots:
 * muted ticks and `chart.*` strokes resolve in light and dark). The design-token check lets
 * `src/charts` through; everything else uses Panda tokens.
 *
 * Non-series ink for chart libraries and SVG attributes, as CSS variable references. Panda emits
 * `--colors-<token>` for semantic tokens and flips them with the theme, so these need no dark-mode
 * branch. Series colours come from `chartColor` instead.
 */
export const CHART_INK = {
  /** Axis tick text. */
  axisText: "var(--colors-text-muted)",
  /** Primary text on a chart surface. */
  text: "var(--colors-text-primary)",
  /** Chart surface, for ring strokes around overlapping marks. */
  surface: "var(--colors-surface-card)",
} as const;
