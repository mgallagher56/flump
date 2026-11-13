import { type ChartSwatchStyle, ChartTooltipContent, type ChartTooltipRow } from "@repo/ui";
import type { FC, ReactNode } from "react";

/** The parts of a recharts tooltip payload entry this adapter reads. */
export interface ChartTooltipPayloadEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: unknown;
  color?: string;
  stroke?: string;
  fill?: string;
  strokeDasharray?: string | number;
  hide?: boolean;
}

export interface ChartTooltipProps {
  /** Supplied by recharts when the tooltip is used as `content={<ChartTooltip />}`. */
  active?: boolean;
  payload?: readonly ChartTooltipPayloadEntry[];
  label?: string | number;
  /** Formats the cursor position (a date or category) for the title. */
  labelFormatter?: (label: string | number) => ReactNode;
  /** Series (by dataKey) to leave out, for example a shaded band. */
  hiddenKeys?: readonly string[];
  /** Swatch style per series (by dataKey). Dashed is inferred from `strokeDasharray`. */
  swatches?: Readonly<Record<string, ChartSwatchStyle>>;
  fractionDigits?: 0 | 2;
}

const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Recharts adapter for `ChartTooltipContent`: maps the tooltip payload to rows. Use as
 * `<Tooltip content={<ChartTooltip />} cursor={chartCursorProps} />`.
 */
export const ChartTooltip: FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  labelFormatter,
  hiddenKeys = [],
  swatches = {},
  fractionDigits,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const rows: ChartTooltipRow[] = payload
    .filter((entry) => !entry.hide && !hiddenKeys.includes(String(entry.dataKey ?? entry.name)))
    .map((entry, index) => {
      const key = String(entry.dataKey ?? entry.name ?? index);
      const swatch: ChartSwatchStyle | undefined =
        swatches[key] ?? (entry.strokeDasharray ? "dashed" : undefined);
      return {
        id: key,
        label: String(entry.name ?? entry.dataKey ?? ""),
        color: entry.color ?? entry.stroke ?? entry.fill ?? "currentColor",
        swatch,
        value: toNumber(entry.value),
      };
    });

  if (rows.length === 0) return null;

  const title =
    label === undefined || label === ""
      ? undefined
      : labelFormatter
        ? labelFormatter(label)
        : label;

  return <ChartTooltipContent fractionDigits={fractionDigits} rows={rows} title={title} />;
};

export default ChartTooltip;
