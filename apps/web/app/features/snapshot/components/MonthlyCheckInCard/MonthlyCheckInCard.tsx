import { Button, Icon } from "@repo/ui";
import { CalendarCheck } from "lucide-react";
import { type FC, useId } from "react";
import { Link } from "react-router";
import { formatMonth, type MonthKey } from "../../snapshotModel";
import { row, rowIcon, rowText, rowTitle } from "./MonthlyCheckInCard.styles";

export const HISTORY_ROUTE = "/app/accounts/history";
/** Opens the check-in sheet on arrival. Carries no figures (no money in URLs). */
export const CHECK_IN_ROUTE = `${HISTORY_ROUTE}?checkIn=1`;

export interface MonthlyCheckInCardProps {
  /** The current Europe/London month. */
  currentMonth: MonthKey;
  /** Latest month with a recorded balance, or null when nothing is recorded yet. */
  lastRecordedMonth: MonthKey | null;
}

/** A check-in is due when this month has no recorded balances yet. */
export const isCheckInDue = ({ currentMonth, lastRecordedMonth }: MonthlyCheckInCardProps) =>
  lastRecordedMonth !== currentMonth;

/**
 * The dashboard's way into the monthly check-in (E30), as one row shown only when a check-in is
 * due. Matter-of-fact: it says what is recorded and offers the check-in. No streaks, no "overdue",
 * nothing that counts missed months.
 */
export const MonthlyCheckInCard: FC<MonthlyCheckInCardProps> = (props) => {
  const headingId = useId();
  if (!isCheckInDue(props)) return null;
  const { lastRecordedMonth } = props;
  const text = lastRecordedMonth
    ? `Last recorded month: ${formatMonth(lastRecordedMonth)}. Balances for this month are not recorded yet.`
    : "Record your balances once a month to see your net worth over time.";

  return (
    <section
      aria-labelledby={headingId}
      className={row()}
      data-testid="monthly-check-in-card"
      id="monthly-check-in-card"
    >
      <span className={rowIcon()}>
        <Icon icon={CalendarCheck} size="md" />
      </span>
      <div className={rowText()}>
        <h2 className={rowTitle()} id={headingId}>
          Monthly check-in
        </h2>
        <p>{text}</p>
      </div>
      <Button asChild size="sm" variant="secondary">
        <Link to={CHECK_IN_ROUTE}>{lastRecordedMonth ? "Update balances" : "Record balances"}</Link>
      </Button>
    </section>
  );
};

export default MonthlyCheckInCard;
