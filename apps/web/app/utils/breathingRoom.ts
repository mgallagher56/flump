/**
 * "Breathing room" wording (owner ruling 15 November 2026, STYLE-GUIDE 12.6). The figure itself is
 * the engine's `monthsOfCover` (identifiers keep that name); this file only words it. Nothing here
 * works a figure out.
 */

export const BREATHING_ROOM_LABEL = "Breathing room";
export const BREATHING_ROOM_DESCRIPTION = "How long your savings would cover the essentials.";
/** Behind the info tip, never in the description. */
export const BREATHING_ROOM_DETAIL =
  "Savings means the accounts you can draw on: your current and savings accounts. The essentials are your essential spending and minimum debt payments.";
export const MONEY_TO_DRAW_ON_LABEL = "Money to draw on";

export interface BreathingRoomWording {
  /** "About", or "More than" for a very long time. */
  leadIn: string;
  /** "1.5 months", "1 month", "10 years". */
  figure: string;
}

/** "4.7 months", "1 month", "10+ years". Plain wording: no target is implied. */
export const formatMonthsOfCover = (months: number): string => {
  if (months > 120) return `${Math.floor(months / 12)}+ years`;
  const value = Math.max(0, months);
  const text = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);
  return `${text} ${text === "1" ? "month" : "months"}`;
};

/** The lead-in and the figure, for a result block: "About" and "1.5 months". */
export const describeBreathingRoom = (months: number): BreathingRoomWording => {
  if (months > 120) return { leadIn: "More than", figure: `${Math.floor(months / 12)} years` };
  return { leadIn: "About", figure: formatMonthsOfCover(months) };
};

/** One phrase for a sentence or a line: "about 1.5 months", "more than 10 years". */
export const breathingRoomPhrase = (months: number): string => {
  const { leadIn, figure } = describeBreathingRoom(months);
  return `${leadIn.toLowerCase()} ${figure}`;
};
