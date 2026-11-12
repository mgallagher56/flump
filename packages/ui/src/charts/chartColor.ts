export const CHART_COLOR_ROLES = [
  "primary",
  "wealth",
  "debt",
  "warning",
  "accentPurple",
  "accentCyan",
  "grid",
  "series1",
  "series2",
  "series3",
  "series4",
  "series5",
  "series6",
  "series7",
  "series8",
  "projection",
  "band",
  "baseline",
] as const;

export type ChartColorRole = (typeof CHART_COLOR_ROLES)[number];

export const SERIES_ROLES = [
  "series1",
  "series2",
  "series3",
  "series4",
  "series5",
  "series6",
  "series7",
  "series8",
] as const satisfies readonly ChartColorRole[];

const kebab = (role: string) => role.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * CSS variable reference for a `chart.*` semantic token, for SVG attributes and chart libraries
 * that cannot take Panda style props. Panda emits `--colors-chart-<kebab-role>`, which flips with
 * the theme automatically.
 */
export function chartColor(role: ChartColorRole): string {
  return `var(--colors-chart-${kebab(role)})`;
}

/** Series colour for the n-th series (0-based), cycling through series1..series8. */
export function seriesColor(index: number): string {
  const n = SERIES_ROLES.length;
  const i = Number.isFinite(index) ? Math.trunc(index) : 0;
  return chartColor(SERIES_ROLES[((i % n) + n) % n] as ChartColorRole);
}
