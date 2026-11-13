import { KpiCard, KpiStrip, Money, ProgressBar, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  type ForecastResult,
  PLSA_COMFORTABLE,
  PLSA_MINIMUM,
  PLSA_MODERATE,
  type PlsaTier,
  SAFE_WITHDRAWAL_RATE,
  UK_ANNUAL_ALLOWANCE,
  UK_LUMP_SUM_ALLOWANCE,
} from "../../forecast";
import {
  allowanceNotice,
  benchmarkPanel,
  benchmarkScale,
  estimateNote,
  perMonth,
  resultsRoot,
} from "./ForecasterResults.styles";

export interface ForecasterResultsProps {
  result: ForecastResult;
  horizonYears: number;
  /** Saved fixed payments into current pots, so "your contributions" shows what goes in each month. */
  directMonthlyContrib: number;
}

export const PLSA_LABELS: Record<PlsaTier, string> = {
  comfortable: "Comfortable standard",
  moderate: "Moderate standard",
  minimum: "Minimum standard",
  below: "Below the PLSA minimum",
};

/**
 * Outcome figures for the illustration. None of these use the hero tone: the page's one hero is
 * the saved "Total in your pots".
 */
export const ForecasterResults: FC<ForecasterResultsProps> = ({
  result,
  horizonYears,
  directMonthlyContrib,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const yourMonthly = result.monthlyEmployee + directMonthlyContrib + result.monthlyExtra;

  return (
    <div className={resultsRoot()}>
      <KpiStrip columns={3}>
        <KpiCard
          label={`Projected pot in ${horizonYears} ${horizonYears === 1 ? "year" : "years"}`}
          subtext={
            <>
              Tax-free lump sum {formatCurrency(result.taxFreeLumpSum)}, drawdown pot{" "}
              {formatCurrency(result.drawdownPotAfterLumpSum)}
            </>
          }
          value={<Money size="lg" value={result.finalBalance} />}
        />
        <KpiCard
          label="Estimated income"
          subtext={`${PLSA_LABELS[result.plsaTier]}, at a ${SAFE_WITHDRAWAL_RATE * 100}% yearly drawdown`}
          value={
            <>
              <Money size="lg" value={result.monthlyRetirementIncome} />
              <span className={perMonth()}>a month</span>
            </>
          }
        />
        <KpiCard
          label="Your contributions"
          subtext={
            <>
              {formatCurrency(yourMonthly)} a month. Employer and growth{" "}
              {formatCurrency(result.totalEmployerContribs + result.totalGrowth)}, of which{" "}
              {formatCurrency(result.totalGrowth)} is investment growth
            </>
          }
          value={<Money size="lg" value={result.totalEmployeeContribs} />}
        />
      </KpiStrip>

      <div className={benchmarkPanel()}>
        <ProgressBar
          label="UK Retirement Living Standards (PLSA), single person"
          max={100}
          size="md"
          value={result.plsaProgressPct}
          valueDisplay={`${formatCurrency(result.annualRetirementIncome)} a year`}
          valueText={`${formatCurrency(result.monthlyRetirementIncome)} a month, ${PLSA_LABELS[result.plsaTier]}`}
        />
        <div className={benchmarkScale()}>
          <span>Minimum {formatCurrency(PLSA_MINIMUM)} a month</span>
          <span>Moderate {formatCurrency(PLSA_MODERATE)} a month</span>
          <span>Comfortable {formatCurrency(PLSA_COMFORTABLE)} a month</span>
        </div>
      </div>

      {result.totalAnnualInflow > UK_ANNUAL_ALLOWANCE && (
        <div className={allowanceNotice()}>
          <StatusBadge showIcon size="sm" variant="warning">
            Above the annual allowance
          </StatusBadge>
          <p>
            Projected paid in is {formatCurrency(result.totalAnnualInflow)} a year, which is above
            the standard {formatCurrency(UK_ANNUAL_ALLOWANCE)} annual allowance unless carry-forward
            applies.
          </p>
        </div>
      )}

      <p className={estimateNote()} id="pension-estimate-note">
        Projection based on the figures above. It assumes a {SAFE_WITHDRAWAL_RATE * 100}% yearly
        drawdown and uses fixed allowances that are not updated each tax year: a{" "}
        {formatCurrency(UK_LUMP_SUM_ALLOWANCE)} lump sum allowance, a{" "}
        {formatCurrency(UK_ANNUAL_ALLOWANCE)} annual allowance and a{" "}
        {formatCurrency(result.statePensionAnnual)} a year State Pension when included.
      </p>
    </div>
  );
};

export default ForecasterResults;
