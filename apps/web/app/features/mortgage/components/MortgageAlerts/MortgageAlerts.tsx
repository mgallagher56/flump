import { Button } from "@repo/ui";
import type { FC } from "react";
import { alertLine, alertText } from "./MortgageAlerts.styles";

export interface RefinanceWarning {
  /** Whole calendar months until the fixed rate ends, never below 0. */
  diffMonths: number;
  /** The renewal date as stored (ISO date). */
  date: string;
  /** True once the end date has passed. When absent, a diffMonths of 0 or less means ended. */
  ended?: boolean;
}

/** The fact itself, with no judgement: when the stored fixed rate ends. */
export const fixedRateEndSentence = ({ diffMonths, ended }: RefinanceWarning): string => {
  if (ended ?? diffMonths <= 0) return "Your fixed rate has ended.";
  if (diffMonths <= 0) return "Your fixed rate ends in less than a month.";
  return `Your fixed rate ends in ${diffMonths} ${diffMonths === 1 ? "month" : "months"}.`;
};

export interface MortgageAlertsProps {
  /** The stored fix-end fact, shown within six months of the end and once it has ended. */
  refinanceWarning: RefinanceWarning | null;
  /** Opens the rate change tool in "Model a change to your mortgage". */
  onModelRateChange: () => void;
}

/**
 * One quiet, factual line about the stored fixed rate end date (E16 PR 6): no status colour, no
 * warning icon and no alarm wording. Renders nothing when no date is due.
 */
export const MortgageAlerts: FC<MortgageAlertsProps> = ({
  refinanceWarning,
  onModelRateChange,
}) => {
  if (!refinanceWarning) return null;
  return (
    <div
      className={alertLine()}
      data-testid="mortgage-refinance-warning"
      id="mortgage-refinance-warning"
    >
      <p className={alertText()}>
        {fixedRateEndSentence(refinanceWarning)} After a fixed rate ends, the rate your lender
        charges can change.
      </p>
      <Button size="sm" variant="ghost" onClick={onModelRateChange}>
        Model a rate change
      </Button>
    </div>
  );
};
