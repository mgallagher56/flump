import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { Money } from "../../primitives/Money/Money";
import {
  ChartSwatch,
  type ChartSwatchColor,
  type ChartSwatchStyle,
} from "../ChartLegend/ChartLegend";
import {
  chartTooltip,
  chartTooltipLabel,
  chartTooltipRow,
  chartTooltipRows,
  chartTooltipTitle,
  chartTooltipValue,
} from "./ChartTooltipContent.styles";

export interface ChartTooltipRow {
  id: string;
  label: string;
  color: ChartSwatchColor;
  swatch?: ChartSwatchStyle;
  /** Pounds. Unknown (null, undefined, NaN) reads "Not set", never £0. */
  value: number | null | undefined;
}

export interface ChartTooltipContentProps {
  /** Usually the date or category the cursor is on, already formatted en-GB. */
  title?: ReactNode;
  rows: readonly ChartTooltipRow[];
  /** Two decimal places, for charts that plot small amounts. Default is whole pounds. */
  fractionDigits?: 0 | 2;
  /** Sets the element `id` and `data-testid`. */
  id?: string;
  className?: string;
}

/**
 * Framework-free tooltip body. Recharts adapters map their payload to `rows` and pass this as the
 * tooltip `content`; nothing here knows about recharts.
 */
export const ChartTooltipContent: FC<ChartTooltipContentProps> = ({
  title,
  rows,
  fractionDigits = 0,
  id,
  className,
}) => (
  <div className={cx(chartTooltip(), className)} data-testid={id ?? "chart-tooltip"} id={id}>
    {title ? <p className={chartTooltipTitle()}>{title}</p> : null}
    <ul className={chartTooltipRows()}>
      {rows.map((row) => (
        <li className={chartTooltipRow()} key={row.id}>
          <ChartSwatch color={row.color} swatch={row.swatch} />
          <span className={chartTooltipLabel()}>{row.label}</span>
          <span className={chartTooltipValue()}>
            <Money fractionDigits={fractionDigits} size="sm" value={row.value} />
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default ChartTooltipContent;
