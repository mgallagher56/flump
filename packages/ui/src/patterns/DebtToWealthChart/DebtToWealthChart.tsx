import type { FC } from "react";
import { css, cx } from "../../../styled-system/css";
import { crossoverChartContainer, crossoverStatsRow } from "./DebtToWealthChart.styles";

export interface DebtToWealthPoint {
  month: number;
  label: string;
  debt: number;
  wealth: number;
}

export interface DebtToWealthChartProps {
  data?: DebtToWealthPoint[];
  monthlyOutflow?: number;
  debtFreeYear?: number;
  wealthAccumulatedFiveYrs?: number;
  className?: string;
}

const defaultPoints: DebtToWealthPoint[] = [
  { month: 0, label: "M0", debt: 8000, wealth: 0 },
  { month: 6, label: "M6", debt: 5600, wealth: 0 },
  { month: 12, label: "M12", debt: 3400, wealth: 0 },
  { month: 18, label: "M18", debt: 1200, wealth: 0 },
  { month: 24, label: "M24", debt: 0, wealth: 1500 },
  { month: 36, label: "M36", debt: 0, wealth: 6200 },
  { month: 48, label: "M48", debt: 0, wealth: 12400 },
  { month: 60, label: "M60", debt: 0, wealth: 21500 },
];

export const DebtToWealthChart: FC<DebtToWealthChartProps> = ({
  data: _data = defaultPoints,
  monthlyOutflow = 315,
  debtFreeYear = 2,
  wealthAccumulatedFiveYrs = 21500,
  className,
}) => {
  return (
    <div className={cx(crossoverChartContainer(), className)}>
      <div>
        <h3
          className={css({
            fontFamily: "display",
            fontSize: "md",
            fontWeight: "bold",
            color: "text.primary",
            margin: "0",
          })}
        >
          Example: after the debts are paid off
        </h3>
        <p className={css({ fontSize: "xs", color: "text.muted", mt: "2px", mb: "0" })}>
          In this example, the monthly payment that went to debts goes into savings once the debts
          reach £0.
        </p>
      </div>

      <div className={crossoverStatsRow()}>
        <div>
          <span className={css({ fontSize: "xs", color: "text.muted" })}>Debt payments now</span>
          <div
            className={css({
              fontFamily: "display",
              fontSize: "lg",
              fontWeight: "bold",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            £{monthlyOutflow} a month
          </div>
          <span className={css({ fontSize: "11px", color: "text.muted" })}>
            Available once the debts are paid off
          </span>
        </div>

        <div>
          <span className={css({ fontSize: "xs", color: "text.muted" })}>Debt-free date</span>
          <div
            className={css({
              fontFamily: "display",
              fontSize: "lg",
              fontWeight: "bold",
              color: "primary",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            Year {debtFreeYear}
          </div>
          <span className={css({ fontSize: "11px", color: "text.muted" })}>Debts reach £0</span>
        </div>

        <div>
          <span className={css({ fontSize: "xs", color: "text.muted" })}>Estimated savings</span>
          <div
            className={css({
              fontFamily: "display",
              fontSize: "lg",
              fontWeight: "bold",
              color: "chart.wealth",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            +£{wealthAccumulatedFiveYrs.toLocaleString("en-GB")}
          </div>
          <span className={css({ fontSize: "11px", color: "status.positive.text" })}>
            5 years after the debt-free date
          </span>
        </div>
      </div>

      {/* Visual SVG 2-Zone Area Crossover */}
      <div
        className={css({
          width: "100%",
          height: "180px",
          position: "relative",
          backgroundColor: "surface.sunken",
          borderRadius: "lg",
          p: "12px",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "border.subtle",
        })}
      >
        <svg height="100%" style={{ overflow: "visible" }} viewBox="0 0 500 150" width="100%">
          <title>Example chart: debts falling to £0, then savings growing</title>
          {/* Zone 1: Debt Area (Decreasing to 0) */}
          <path
            d="M 10 20 L 120 60 L 220 130 L 250 140 L 10 140 Z"
            fill="var(--colors-chart-debt)"
            fillOpacity="0.18"
          />
          <path
            d="M 10 20 L 120 60 L 220 130 L 250 140"
            fill="none"
            stroke="var(--colors-chart-debt)"
            strokeWidth="2.5"
          />

          {/* Zone 2: Wealth Area (Exponential increase from month 24) */}
          <path
            d="M 250 140 L 320 100 L 400 50 L 490 10 L 490 140 L 250 140 Z"
            fill="var(--colors-chart-wealth)"
            fillOpacity="0.22"
          />
          <path
            d="M 250 140 L 320 100 L 400 50 L 490 10"
            fill="none"
            stroke="var(--colors-chart-wealth)"
            strokeWidth="2.5"
          />

          {/* Crossover Dot */}
          <circle cx="250" cy="140" fill="var(--colors-primary)" r="5" />
          <text
            fill="var(--colors-text-muted)"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            x="250"
            y="125"
          >
            Debts paid off
          </text>
        </svg>
      </div>
    </div>
  );
};

export default DebtToWealthChart;
