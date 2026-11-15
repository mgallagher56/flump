import { formatMoney, ResultBlock, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { formatEstimate } from "~/utils/roundEstimate";
import { type ForecastResult, UK_ANNUAL_ALLOWANCE } from "../../forecast";
import { allowanceBadge } from "./ForecasterResults.styles";

export interface ForecasterResultsProps {
  /** The illustration at the scenario inputs. */
  result: ForecastResult;
  /** The same projection at the saved figures, for the comparison figure. */
  savedResult: ForecastResult;
  /** "at retirement" or "at the age you chose": when the pot is drawn on. */
  whenLabel: string;
  /** True when figures are shown in today's money. */
  inTodaysMoney: boolean;
}

const money = (n: number) => formatMoney(n, { fractionDigits: 0 }).text;

/**
 * The retirement tool's outcome (E16 P1.7) in the zone's one result card (E17 5A): one figure (the
 * estimated pot at retirement, rounded to three significant figures) and, once an input moves, the
 * change in monthly income against the saved figures as its one row. The tax-free lump sum sits
 * behind the chart's "Show data". The saved monthly income is the page's first KPI, so it is never
 * repeated here. Never the hero tone.
 */
export const ForecasterResults: FC<ForecasterResultsProps> = ({
  result,
  savedResult,
  whenLabel,
  inTodaysMoney,
}) => {
  const change = result.monthlyRetirementIncome - savedResult.monthlyRetirementIncome;
  return (
    <ResultBlock
      figure={formatEstimate(result.finalBalance)}
      id="pension-scenario-outcome"
      label={
        inTodaysMoney
          ? `Estimated pot ${whenLabel}`
          : `Estimated pot ${whenLabel}, before inflation`
      }
      note={
        result.totalAnnualInflow > UK_ANNUAL_ALLOWANCE ? (
          <>
            <StatusBadge className={allowanceBadge()} size="sm" variant="neutral">
              Above the annual allowance
            </StatusBadge>{" "}
            In this illustration {money(result.totalAnnualInflow)} a year is paid in. The standard
            annual allowance is {money(UK_ANNUAL_ALLOWANCE)}.
          </>
        ) : undefined
      }
      // Shown only once an input moves: at the saved figures it would always read "No change".
      row={
        change !== 0
          ? {
              label: "Change in monthly income",
              value: `${formatMoney(change, { fractionDigits: 0, signDisplay: "always" }).text} a month`,
            }
          : undefined
      }
    />
  );
};

export default ForecasterResults;
