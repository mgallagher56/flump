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

export const TAKE_HOME_LABEL = "Monthly take-home pay (estimate)";
const NOT_SET = "Not set";

/**
 * One live figure, the monthly take-home, from what has been entered so far (P1: one figure per
 * step). A note says why it moved (a pension or student loan answered on a later step) and when
 * a tax region is assumed. Unknown reads "Not set", never £0.
 */
export const LiveSummaryBar: FC<LiveSummaryBarProps> = ({ summary, assumingRegion }) => {
  const { formatCurrency } = useFormatCurrency();
  const classes = liveSummaryRecipe({ tone: summary.hasIncome ? "neutral" : "unset" });
  return (
    <div
      className={classes.cell}
      data-testid="onboarding-live-summary"
      id="onboarding-live-summary"
    >
      <span className={classes.label} id="onboarding-take-home-label">
        {TAKE_HOME_LABEL}
      </span>
      <span
        className={classes.figure}
        data-figure="takeHome.monthly"
        data-testid="onboarding-take-home"
        id="onboarding-take-home"
      >
        {summary.hasIncome ? formatCurrency(summary.monthlyTakeHome) : NOT_SET}
      </span>
      {assumingRegion ? (
        <span
          className={classes.note}
          data-testid="onboarding-take-home-assumption"
          id="onboarding-take-home-assumption"
        >
          {REGION_ASSUMPTION_LABEL}
        </span>
      ) : null}
      {summary.hasIncome && summary.takeHomeNote ? (
        <span
          className={classes.note}
          data-testid="onboarding-take-home-note"
          id="onboarding-take-home-note"
        >
          {summary.takeHomeNote}
        </span>
      ) : null}
    </div>
  );
};
