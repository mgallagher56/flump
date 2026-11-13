/**
 * @deprecated Moved to `~/features/charts` (E15 T2.11). Use `ChartTooltip` and the prop presets
 * (`chartGridProps`, `chartXAxisProps`, `chartYAxisProps`, ...) instead. This file stays as a
 * re-export so current charts keep working until their screens migrate.
 */
export {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from "~/features/charts/utils/legacyTooltipStyles";
