import { Button, CoachCard, formatMoney, Icon } from "@repo/ui";
import { Flame } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";
import { allowanceLink, allowanceNote } from "./StageCoachCard.styles";

export interface StageCoachCardProps {
  /** High-cost unsecured debt still to clear. */
  unsecuredDebt: number;
  /** Projected debt-free date as text, or `null` when it cannot be calculated yet. */
  debtFreeDate: string | null;
  /** Weekly safe-to-spend allowance, or `null` when there is no budget to base it on. */
  weeklyAllowance: number | null;
}

/** Stage 1 (stabilise and clear) coach card. Shown only while unsecured debt is the priority. */
export const StageCoachCard: FC<StageCoachCardProps> = ({
  unsecuredDebt,
  debtFreeDate,
  weeklyAllowance,
}) => {
  const debt = formatMoney(unsecuredDebt).text;
  const target = debtFreeDate
    ? `Debt-free target: ${debtFreeDate}.`
    : "Debt-free date not calculated yet.";

  return (
    <CoachCard
      description={`${debt} of unsecured debt remaining. ${target}`}
      eyebrow="Stage 1: stabilise and clear"
      headingLevel="h2"
      icon={<Icon icon={Flame} size="lg" />}
      id="stage-coach-card"
      primaryAction={
        <Button asChild size="sm" variant="primary">
          <Link to="/app/debt">Open debt payoff</Link>
        </Button>
      }
      secondaryAction={
        weeklyAllowance === null ? (
          <Link className={allowanceLink()} to="/app/budget">
            Add your budget to see your safe to spend allowance
          </Link>
        ) : (
          <span className={allowanceNote()}>
            Safe to spend: {formatMoney(weeklyAllowance).text} a week
          </span>
        )
      }
      title="Clear your high-cost debt first"
    />
  );
};
