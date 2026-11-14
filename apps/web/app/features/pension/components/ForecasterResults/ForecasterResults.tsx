import { formatMoney, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { type ForecastResult, UK_ANNUAL_ALLOWANCE } from "../../forecast";
import {
  allowanceNote,
  outcome,
  outcomeLabel,
  outcomeSuffix,
  outcomeSupport,
  outcomeSupportItem,
  outcomeValue,
} from "./ForecasterResults.styles";

export interface ForecasterResultsProps {
  /** The illustration at the scenario inputs. */
  result: ForecastResult;
  /** The same projection at the saved figures, for the comparison figure. */
  savedResult: ForecastResult;
  /** "at 67" or "in 25 years": when the pot is drawn on. */
  whenLabel: string;
  /** True when figures are shown in today's money. */
  inTodaysMoney: boolean;
}

const money = (n: number) => formatMoney(n, { fractionDigits: 0 }).text;

/**
 * The retirement tool's outcome (E16 P1.7): one figure (estimated income a month) and two
 * supporting figures (the pot, and the change against the saved figures). Never the hero tone.
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
          ? "Estimated income at retirement"
          : "Estimated income at retirement, before inflation"}
      </p>
      <p className={outcomeValue()}>
        {money(result.monthlyRetirementIncome)} <span className={outcomeSuffix()}>a month</span>
      </p>
      <dl className={outcomeSupport()}>
        <div className={outcomeSupportItem()}>
          <dt>Pot {whenLabel}</dt>
          <dd>{money(result.finalBalance)}</dd>
        </div>
        <div className={outcomeSupportItem()}>
          <dt>Against your saved figures</dt>
          <dd>
            {change === 0
              ? "No change"
              : `${formatMoney(change, { fractionDigits: 0, signDisplay: "always" }).text} a month`}
          </dd>
        </div>
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
