import { formatMoney, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { formatEstimate } from "~/utils/roundEstimate";
import { type ForecastResult, UK_ANNUAL_ALLOWANCE } from "../../forecast";
import {
  allowanceNote,
  outcome,
  outcomeLabel,
  outcomeSupport,
  outcomeSupportItem,
  outcomeValue,
} from "./ForecasterResults.styles";

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
 * The retirement tool's outcome (E16 P1.7): one figure (the estimated pot at retirement, rounded
 * to three significant figures) and up to two supporting figures (the tax-free lump sum, and,
 * once an input moves, the change in monthly income against the saved figures). The saved
 * monthly income is the page's first KPI, so it is never repeated here.
 * Never the hero tone.
 */
export const ForecasterResults: FC<ForecasterResultsProps> = ({
  result,
  savedResult,
  whenLabel,
  inTodaysMoney,
}) => {
  const change = result.monthlyRetirementIncome - savedResult.monthlyRetirementIncome;
  return (
    <div className={outcome()} data-testid="pension-scenario-outcome" id="pension-scenario-outcome">
      <p className={outcomeLabel()}>
        {inTodaysMoney
          ? `Estimated pot ${whenLabel}`
          : `Estimated pot ${whenLabel}, before inflation`}
      </p>
      <p className={outcomeValue()}>{formatEstimate(result.finalBalance)}</p>
      <dl className={outcomeSupport()}>
        <div className={outcomeSupportItem()}>
          <dt>Tax-free lump sum</dt>
          <dd>{formatEstimate(result.taxFreeLumpSum)}</dd>
        </div>
        {/* Shown only once an input moves: at the saved figures it would always read "No change". */}
        {change !== 0 && (
          <div className={outcomeSupportItem()}>
            <dt>Change in monthly income</dt>
            <dd>{`${formatMoney(change, { fractionDigits: 0, signDisplay: "always" }).text} a month`}</dd>
          </div>
        )}
      </dl>
      {result.totalAnnualInflow > UK_ANNUAL_ALLOWANCE && (
        <p className={allowanceNote()}>
          <StatusBadge size="sm" variant="neutral">
            Above the annual allowance
          </StatusBadge>{" "}
          In this illustration {money(result.totalAnnualInflow)} a year is paid in. The standard
          annual allowance is {money(UK_ANNUAL_ALLOWANCE)}.
        </p>
      )}
    </div>
  );
};

export default ForecasterResults;
