import { isCheckInDue as isCheckInDueOn } from "@flump/finance-engine";
import { Button, Icon } from "@repo/ui";
import { CalendarCheck } from "lucide-react";
import { type FC, useId } from "react";
import { Link } from "react-router";
import { formatMonth, londonDateIn, type MonthKey } from "../../snapshotModel";
import { row, rowIcon, rowText, rowTitle } from "./MonthlyCheckInCard.styles";

export const HISTORY_ROUTE = "/app/accounts/history";
/** Opens the check-in sheet on arrival. Carries no figures (no money in URLs). */
export const CHECK_IN_ROUTE = `${HISTORY_ROUTE}?checkIn=1`;

export interface MonthlyCheckInCardProps {
  /** The current Europe/London month. */
  currentMonth: MonthKey;
  /** Latest month with a recorded balance, or null when nothing is recorded yet. */
  lastRecordedMonth: MonthKey | null;
  /** Whether a check-in is in progress (Rule B17). */
  partDone?: boolean;
  /** Today in Europe/London, "YYYY-MM-DD". Defaults to the clock (or the 1st of `currentMonth`). */
  today?: string;
  /** The saved check-in day (1 to 31), or null when none is chosen (the 1st). */
  checkInDay?: number | null;
}

/**
 * Whether the check-in is shown: never once this month is recorded, always before anything is
 * recorded, otherwise from the user's check-in day (or at once if last month was missed too).
 * The rule lives in `@flump/finance-engine`.
 */
export const isCheckInDue = ({
  currentMonth,
  lastRecordedMonth,
  today,
  checkInDay = null,
}: MonthlyCheckInCardProps): boolean =>
  isCheckInDueOn({ today: today ?? londonDateIn(currentMonth), checkInDay, lastRecordedMonth });

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
      <Button asChild size="sm" variant="outline">
        <Link to={CHECK_IN_ROUTE}>
          {props.partDone ? "Continue check-in" : "Start monthly check-in"}
        </Link>
      </Button>
    </section>
  );
};

export default MonthlyCheckInCard;
