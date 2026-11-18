import { addCheckInMonths, type CheckInMonth, compareCheckInMonths } from "./check-in.js";

/**
 * The check-in day (UX Batch E): which day of the month the monthly check-in falls on. Pure and
 * shared by the web app and later the mobile app, so both surface the check-in on the same day.
 * A day the month does not have (29 to 31) falls on that month's last day. No reminders here:
 * these rules only decide when the check-in is shown and what date the next one is.
 */

/** "YYYY-MM-DD", a Europe/London calendar date. */
export type CheckInDate = string;

/** The days a person can choose, 1 to 31. */
export const CHECK_IN_DAYS: readonly number[] = Array.from({ length: 31 }, (_, i) => i + 1);

const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** A saved day as a usable one: null, missing or out of range reads as the 1st. */
function effectiveDay(day: number | null | undefined): number {
  return typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1;
}

/** The check-in date in `month`: the chosen day, or the month's last day if it is shorter. */
export function checkInDateForMonth(
  month: CheckInMonth,
  day: number | null | undefined,
): CheckInDate {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Not a month key: ${month}`);
  const daysInMonth = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  const d = Math.min(effectiveDay(day), daysInMonth);
  return `${month}-${String(d).padStart(2, "0")}`;
}

export interface CheckInScheduleInput {
  /** Today in Europe/London, "YYYY-MM-DD". */
  today: CheckInDate;
  /** The saved check-in day, or null when none is chosen (the 1st). */
  checkInDay: number | null | undefined;
  /** The latest month with recorded balances, or null when nothing is recorded yet. */
  lastRecordedMonth: CheckInMonth | null;
}

function monthOf(today: CheckInDate): CheckInMonth {
  const m = DATE_RE.exec(today);
  if (!m) throw new Error(`Not a date: ${today}`);
  return `${m[1]}-${m[2]}`;
}

/**
 * Whether the check-in is shown. Never once this month is recorded. Always when nothing has ever
 * been recorded, so a new user keeps seeing the way in. Otherwise from this month's check-in date,
 * or straight away when last month was not recorded either, so it is never hidden for weeks.
 */
export function isCheckInDue({ today, checkInDay, lastRecordedMonth }: CheckInScheduleInput) {
  const thisMonth = monthOf(today);
  if (lastRecordedMonth === null) return true;
  if (compareCheckInMonths(lastRecordedMonth, thisMonth) >= 0) return false;
  if (today >= checkInDateForMonth(thisMonth, checkInDay)) return true;
  return compareCheckInMonths(lastRecordedMonth, addCheckInMonths(thisMonth, -1)) < 0;
}

/**
 * The next check-in date: this month's, while this month is not recorded and its date is still
 * ahead; otherwise next month's.
 */
export function nextCheckInDate({
  today,
  checkInDay,
  lastRecordedMonth,
}: CheckInScheduleInput): CheckInDate {
  const thisMonth = monthOf(today);
  const thisDate = checkInDateForMonth(thisMonth, checkInDay);
  const recorded =
    lastRecordedMonth !== null && compareCheckInMonths(lastRecordedMonth, thisMonth) >= 0;
  if (!recorded && today < thisDate) return thisDate;
  return checkInDateForMonth(addCheckInMonths(thisMonth, 1), checkInDay);
}
