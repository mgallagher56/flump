import { Button, Icon, VisuallyHidden } from "@repo/ui";
import { CalendarCheck } from "lucide-react";
import { type FC, useId } from "react";
import { Link } from "react-router";
import {
  CHECK_IN_ROUTE,
  isCheckInDue,
  type MonthlyCheckInCardProps,
} from "~/features/snapshot/components/MonthlyCheckInCard";
import { formatMonth } from "~/features/snapshot/snapshotModel";
import { row, rowIcon, rowText } from "./CheckInRow.styles";

export type CheckInRowProps = MonthlyCheckInCardProps;

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "November" for "2026-11" (en-GB, the month name only); the key itself if it is malformed. */
export const monthName = (month: string): string => {
  const m = MONTH_KEY.exec(month);
  if (!m) return month;
  return new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)),
  );
};

/**
 * The one line the row says, from the saved check-ins (CH-3): when the last one was, that there
 * has been none, or (when that could not be read) which month to record.
 */
export const checkInLine = ({ currentMonth, lastCheckInMonth }: CheckInRowProps): string =>
  lastCheckInMonth
    ? `Last check-in: ${formatMonth(lastCheckInMonth)}`
    : lastCheckInMonth === null
      ? "No monthly check-in yet"
      : `Record your ${monthName(currentMonth)} balances`;

/**
 * The dashboard's way into the monthly check-in (E30, R2-4 item 5): one line and one button, drawn
 * only while this month's check-in is not done. Matter-of-fact: no streaks, no "overdue", nothing
 * that counts missed months. The heading is for screen readers; the line says the rest.
 */
export const CheckInRow: FC<CheckInRowProps> = (props) => {
  const headingId = useId();
  if (!isCheckInDue(props)) return null;

  return (
    <section
      aria-labelledby={headingId}
      className={row()}
      data-testid="monthly-check-in-card"
      id="monthly-check-in-card"
    >
      <VisuallyHidden>
        <h2 id={headingId}>Monthly check-in</h2>
      </VisuallyHidden>
      <span className={rowIcon()}>
        <Icon icon={CalendarCheck} size="md" />
      </span>
      <p className={rowText()}>{checkInLine(props)}</p>
      <Button asChild size="sm" variant="outline">
        <Link to={CHECK_IN_ROUTE}>
          {props.partDone ? "Continue check-in" : "Start monthly check-in"}
        </Link>
      </Button>
    </section>
  );
};
