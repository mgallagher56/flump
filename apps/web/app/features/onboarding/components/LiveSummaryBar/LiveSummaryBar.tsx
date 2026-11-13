import { KpiStrip } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { REGION_ASSUMPTION_LABEL } from "~/utils/taxTrapCopy";
import type { OnboardingSummary } from "../../deriveOnboardingSummary";
import { liveSummaryRecipe } from "./LiveSummaryBar.styles";

export interface LiveSummaryBarProps {
  summary: OnboardingSummary;
  /** True when a gross salary is being used and no tax region has been chosen yet. */
  assumingRegion: boolean;
}

const NOT_SET = "Not set";

/** Live figures from what has been entered so far. Unknown inputs read "Not set", never £0. */
export const LiveSummaryBar: FC<LiveSummaryBarProps> = ({ summary, assumingRegion }) => {
  const { formatCurrency } = useFormatCurrency();
  const signed = (value: number) => `${value >= 0 ? "+" : ""}${formatCurrency(value)}`;

  const takeHome = summary.hasIncome ? `${formatCurrency(summary.monthlyTakeHome)}/mo` : NOT_SET;
  const surplus = summary.hasIncome ? `${signed(summary.monthlySurplus)}/mo` : NOT_SET;
  const netWorth = summary.hasNetWorthInputs ? formatCurrency(summary.startingNetWorth) : NOT_SET;

  // Neutral ink for every known figure: the sign in the text carries the direction, so these
  // early, partial estimates are not painted as good or bad news.
  const takeHomeClasses = liveSummaryRecipe({ tone: summary.hasIncome ? "neutral" : "unset" });
  const surplusClasses = liveSummaryRecipe({ tone: summary.hasIncome ? "neutral" : "unset" });
  const worthClasses = liveSummaryRecipe({
    tone: summary.hasNetWorthInputs ? "neutral" : "unset",
  });

  return (
    <KpiStrip columns={3}>
      <div className={takeHomeClasses.cell}>
        <span className={takeHomeClasses.label}>Net take-home</span>
        <span
          className={takeHomeClasses.figure}
          data-figure="takeHome.monthly"
          data-testid="onboarding-take-home"
          id="onboarding-take-home"
        >
          {takeHome}
        </span>
        {assumingRegion ? (
          <span
            className={takeHomeClasses.note}
            data-testid="onboarding-take-home-assumption"
            id="onboarding-take-home-assumption"
          >
            {REGION_ASSUMPTION_LABEL}
          </span>
        ) : null}
      </div>
      <div className={surplusClasses.cell}>
        <span className={surplusClasses.label}>Monthly surplus</span>
        <span
          className={surplusClasses.figure}
          data-testid="onboarding-surplus"
          id="onboarding-surplus"
        >
          {surplus}
        </span>
      </div>
      <div className={worthClasses.cell}>
        <span className={worthClasses.label}>Starting net worth</span>
        <span
          className={worthClasses.figure}
          data-testid="onboarding-net-worth"
          id="onboarding-net-worth"
        >
          {netWorth}
        </span>
      </div>
    </KpiStrip>
  );
};
