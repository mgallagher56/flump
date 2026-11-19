/**
 * The one place Breathing room (the engine's `monthsOfCover`) is put into words, for the web app,
 * the marketing previews and any AI tool text, so they all read the same. Nothing here works a
 * figure out.
 *
 * Owner rulings: "About 1.5 months" style under a year (15 November 2026); from 12 months, whole
 * years and months, "1 year", "1 year 1 month" (18 November 2026).
 *
 * Rounding: under a year the figure keeps one decimal place. When that rounds to 12 or more (so
 * 11.96 never reads "About 12 months") the year form takes over, from whole months rounded half
 * up: 12.4 is "1 year", 12.5 is "1 year 1 month", 23.6 is "2 years". Above 120 months the existing
 * cap reads "More than 10 years". "About" stays in front of the year form: it is still an estimate.
 */

/** Months above which the figure reads "More than N years". */
export const BREATHING_ROOM_CAP_MONTHS = 120;

export interface BreathingRoomWording {
  /** "About", or "More than" above the cap. */
  leadIn: "About" | "More than";
  /** "1.5 months", "1 month", "1 year 1 month", "10 years". */
  figure: string;
}

const oneDecimal = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/** "1 year", "1 year 1 month", "2 years 3 months": never "0 months". */
const yearsAndMonths = (wholeMonths: number): string => {
  const years = Math.floor(wholeMonths / 12);
  const months = wholeMonths % 12;
  const yearPart = plural(years, "year", "years");
  return months === 0 ? yearPart : `${yearPart} ${plural(months, "month", "months")}`;
};

/** True for a figure that can be worded: a finite number. */
const isKnown = (months: number | null | undefined): months is number =>
  typeof months === "number" && Number.isFinite(months);

/** The lead-in and the figure, or null when the figure is not known. */
export function describeBreathingRoom(
  months: number | null | undefined,
): BreathingRoomWording | null {
  if (!isKnown(months)) return null;
  if (months > BREATHING_ROOM_CAP_MONTHS) {
    return {
      leadIn: "More than",
      figure: plural(Math.floor(months / 12), "year", "years"),
    };
  }
  const value = Math.max(0, months);
  const tenths = Math.round(value * 10) / 10;
  if (tenths < 12) {
    // The plural follows the figure as shown, so 1.04 reads "1 month", not "1 months".
    const shown = oneDecimal.format(tenths);
    return { leadIn: "About", figure: `${shown} ${shown === "1" ? "month" : "months"}` };
  }
  return { leadIn: "About", figure: yearsAndMonths(Math.max(12, Math.round(value))) };
}

/** The figure alone: "1.5 months", "1 year 1 month", "10+ years" above the cap, or "Not set". */
export function formatBreathingRoomFigure(months: number | null | undefined): string {
  const wording = describeBreathingRoom(months);
  if (!wording) return "Not set";
  if (wording.leadIn === "More than") return `${Math.floor((months as number) / 12)}+ years`;
  return wording.figure;
}

/** As a value: "About 1.5 months", "About 1 year 1 month", "More than 10 years", or "Not set". */
export function breathingRoomValue(months: number | null | undefined): string {
  const wording = describeBreathingRoom(months);
  return wording ? `${wording.leadIn} ${wording.figure}` : "Not set";
}

/** Inside a sentence: "about 1.5 months", "more than 10 years", or "not set". */
export function breathingRoomPhrase(months: number | null | undefined): string {
  const value = breathingRoomValue(months);
  return value.charAt(0).toLowerCase() + value.slice(1);
}
