import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { CHART_COLOR_ROLES, type ChartColorRole, chartColor } from "../../charts/chartColor";
import { Money } from "../../primitives/Money/Money";
import {
  chartLegendItem,
  chartLegendLabel,
  chartLegendList,
  chartLegendValue,
  chartSwatch,
} from "./ChartLegend.styles";

/** How a series is drawn: a solid line, a line over a soft fill, or a dashed projection line. */
export type ChartSwatchStyle = "line" | "area" | "dashed";

/** A `chart.*` role, or a CSS colour value passed through by a chart adapter. */
export type ChartSwatchColor = ChartColorRole | (string & {});

const isRole = (color: string): color is ChartColorRole =>
  (CHART_COLOR_ROLES as readonly string[]).includes(color);

/** Resolves a role name to its CSS variable; any other string is used as given. */
export const resolveChartColor = (color: ChartSwatchColor): string =>
  isRole(color) ? chartColor(color) : color;

export interface ChartSwatchProps {
  color: ChartSwatchColor;
  swatch?: ChartSwatchStyle;
  className?: string;
}

/** Short key mark. The shape (solid, filled, dashed) carries identity as well as the colour. */
export const ChartSwatch: FC<ChartSwatchProps> = ({ color, swatch = "line", className }) => {
  const stroke = resolveChartColor(color);
  const dashed = swatch === "dashed";
  const y = swatch === "area" ? 4 : 6;
  return (
    <svg
      aria-hidden="true"
      className={cx(chartSwatch(), className)}
      data-swatch={swatch}
      focusable="false"
      height="12"
      role="presentation"
      viewBox="0 0 24 12"
      width="24"
    >
      {swatch === "area" ? (
        <rect fill={stroke} fillOpacity="0.18" height="8" width="24" x="0" y="4" />
      ) : null}
      <line
        stroke={stroke}
        strokeDasharray={dashed ? "5 4" : undefined}
        strokeLinecap={dashed ? "butt" : "round"}
        strokeWidth="3"
        x1={dashed ? 0 : 1.5}
        x2={dashed ? 24 : 22.5}
        y1={y}
        y2={y}
      />
    </svg>
  );
};

export interface ChartLegendItem {
  id: string;
  label: string;
  color: ChartSwatchColor;
  swatch?: ChartSwatchStyle;
  /** Optional figure in pounds. `null` reads "Not set"; leave it out to show the label alone. */
  value?: number | null;
}

export interface ChartLegendProps {
  items: readonly ChartLegendItem[];
  /** Names the list for assistive tech. */
  label?: string;
  direction?: "horizontal" | "vertical";
  /** Sets the list `id` and `data-testid`; item test ids become `<id>-<item id>`. */
  id?: string;
  className?: string;
}

export const ChartLegend: FC<ChartLegendProps> = ({
  items,
  label = "Chart key",
  direction = "horizontal",
  id,
  className,
}) => (
  <ul
    aria-label={label}
    className={cx(chartLegendList({ direction }), className)}
    data-testid={id ?? "chart-legend"}
    id={id}
  >
    {items.map((item) => (
      <li
        className={chartLegendItem()}
        data-testid={`${id ?? "chart-legend"}-${item.id}`}
        key={item.id}
      >
        <ChartSwatch color={item.color} swatch={item.swatch} />
        <span className={chartLegendLabel()}>{item.label}</span>
        {item.value !== undefined ? (
          <span className={chartLegendValue()}>
            <Money size="sm" value={item.value} />
          </span>
        ) : null}
      </li>
    ))}
  </ul>
);

export default ChartLegend;
