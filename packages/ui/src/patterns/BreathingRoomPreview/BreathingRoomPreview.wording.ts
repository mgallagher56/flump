/**
 * "Breathing room" wording for the previews (owner ruling 15 November 2026, STYLE-GUIDE 12.6).
 * The figure is the engine's `monthsOfCover`; this file only words it and works nothing out.
 * It mirrors `apps/web/app/utils/breathingRoom.ts` so marketing and the app read the same.
 */

export const BREATHING_ROOM_LABEL = "Breathing room";
export const BREATHING_ROOM_DESCRIPTION = "How long your savings would cover the essentials.";

const monthsFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** "4.7 months", "1 month", "10+ years". Plain wording: no target is implied. */
export const formatBreathingRoomMonths = (months: number): string => {
  if (months > 120) return `${Math.floor(months / 12)}+ years`;
  const value = Math.max(0, months);
  return `${monthsFormat.format(value)} ${value === 1 ? "month" : "months"}`;
};

/** The figure as a value: "About 1.5 months", "About 1 month", "More than 10 years". */
export const breathingRoomValue = (months: number): string =>
  months > 120
    ? `More than ${Math.floor(months / 12)} years`
    : `About ${formatBreathingRoomMonths(months)}`;

/** The figure inside a line: "about 1.5 months". */
export const breathingRoomPhrase = (months: number): string => {
  const value = breathingRoomValue(months);
  return value.charAt(0).toLowerCase() + value.slice(1);
};
