import { ButtonLink, formatMoney, Icon } from "@repo/ui";
import { CreditCard } from "lucide-react";
import type { FC } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import {
  allowanceLink,
  allowanceNote,
  payoffLink,
  summaryBody,
  summaryDescription,
  summaryIcon,
  summaryLinks,
  summaryRoot,
  summaryTitle,
} from "./StageCoachCard.styles";

export interface StageCoachCardProps {
  /** High-cost unsecured debt still to clear. */
  unsecuredDebt: number;
  /** Projected debt-free date as text, or `null` when it cannot be calculated yet. */
  debtFreeDate: string | null;
  /** Weekly safe-to-spend allowance, or `null` when there is no budget to base it on. */
  weeklyAllowance: number | null;
}

/**
 * Unsecured debt summary card. The lifecycle stage only decides whether the card shows (R4);
 * its wording is the same factual summary for everyone and names no action to take. It is a
 * plain summary card, not a CoachCard, because R4 keeps CoachCard to app housekeeping. It keeps the
 * approved E15 treatment: a teal-tinted surface and a solid "Open debt payoff" link button.
 */
export const StageCoachCard: FC<StageCoachCardProps> = ({
  unsecuredDebt,
  debtFreeDate,
  weeklyAllowance,
}) => {
  const debt = formatMoney(unsecuredDebt).text;
  const target = debtFreeDate
    ? `Projected debt-free date: ${debtFreeDate}.`
    : "Debt-free date not calculated yet.";

  return (
    <section
      aria-labelledby="stage-coach-card-title"
      className={summaryRoot()}
      data-testid="stage-coach-card"
      id="stage-coach-card"
    >
      <div aria-hidden="true" className={summaryIcon()}>
        <Icon icon={CreditCard} size="lg" />
      </div>
      <div className={summaryBody()}>
        <h3 className={summaryTitle()} id="stage-coach-card-title">
          Your unsecured debt and payoff date
        </h3>
        <p className={summaryDescription()}>
          {debt} of unsecured debt remaining. {target}
        </p>
        <div className={summaryLinks()}>
          <ButtonLink asChild className={payoffLink()} size="sm" variant="primary">
            <SampleAwareLink to="/app/debt">Open debt payoff</SampleAwareLink>
          </ButtonLink>
          {weeklyAllowance === null ? (
            <SampleAwareLink className={allowanceLink()} to="/app/budget">
              Add your budget to see your safe to spend allowance
            </SampleAwareLink>
          ) : (
            <span className={allowanceNote()}>
              Safe to spend: {formatMoney(weeklyAllowance).text} a week
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
