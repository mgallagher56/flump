import { Button, Card, Icon } from "@repo/ui";
import { CalendarCheck } from "lucide-react";
import { type FC, useId } from "react";
import { Link } from "react-router";
import { formatMonth, type MonthKey } from "../../snapshotModel";
import { cardBody, cardHeader, cardLinks, cardText, cardTitle } from "./MonthlyCheckInCard.styles";

export const HISTORY_ROUTE = "/app/accounts/history";
/** Opens the check-in sheet on arrival. Carries no figures (no money in URLs). */
export const CHECK_IN_ROUTE = `${HISTORY_ROUTE}?checkIn=1`;

export interface MonthlyCheckInCardProps {
  /** The current Europe/London month. */
  currentMonth: MonthKey;
  /** Latest month with a recorded balance, or null when nothing is recorded yet. */
  lastRecordedMonth: MonthKey | null;
}

/**
 * The dashboard's way into the monthly check-in (E30). Matter-of-fact: it says what is recorded
 * and offers the check-in. No streaks, no "overdue", nothing that counts missed months.
 */
export const MonthlyCheckInCard: FC<MonthlyCheckInCardProps> = ({
  currentMonth,
  lastRecordedMonth,
}) => {
  const headingId = useId();
  const recordedThisMonth = lastRecordedMonth === currentMonth;
  const text = recordedThisMonth
    ? `Balances recorded for ${formatMonth(currentMonth)}. You can update them any time this month.`
    : lastRecordedMonth
      ? `Last recorded month: ${formatMonth(lastRecordedMonth)}. Update your balances for ${formatMonth(currentMonth)} whenever suits you.`
      : "Record your balances once a month to see your net worth over time.";

  return (
    <Card
      aria-labelledby={headingId}
      as="section"
      className={cardBody()}
      data-testid="monthly-check-in-card"
      id="monthly-check-in-card"
      padding="md"
    >
      <div className={cardHeader()}>
        <Icon icon={CalendarCheck} size="md" />
        <h3 className={cardTitle()} id={headingId}>
          Monthly check-in
        </h3>
      </div>
      <p className={cardText()}>{text}</p>
      <div className={cardLinks()}>
        <Button asChild size="sm" variant={recordedThisMonth ? "secondary" : "primary"}>
          <Link to={CHECK_IN_ROUTE}>Update balances</Link>
        </Button>
        {lastRecordedMonth ? (
          <Button asChild size="sm" variant="ghost">
            <Link to={HISTORY_ROUTE}>View history</Link>
          </Button>
        ) : null}
      </div>
    </Card>
  );
};

export default MonthlyCheckInCard;
