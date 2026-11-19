/**
 * "Breathing room" wording for the previews (owner ruling 15 November 2026, STYLE-GUIDE 12.6).
 * The figure is the engine's `monthsOfCover`; this file only words it and works nothing out.
 * The wording itself lives in the engine (`breathing-room-wording.ts`), shared with the app and
 * AI text, so marketing and the app read the same.
 */

import {
  formatBreathingRoomFigure,
  breathingRoomPhrase as phrase,
  breathingRoomValue as value,
} from "@flump/finance-engine";

export const BREATHING_ROOM_LABEL = "Breathing room";
export const BREATHING_ROOM_DESCRIPTION = "How long your savings would cover the essentials.";

/** "4.7 months", "1 month", "1 year 1 month", "10+ years". Plain wording: no target is implied. */
export const formatBreathingRoomMonths = (months: number): string =>
  formatBreathingRoomFigure(months);

/** The figure as a value: "About 1.5 months", "About 1 year 1 month", "More than 10 years". */
export const breathingRoomValue = (months: number): string => value(months);

/** The figure inside a line: "about 1.5 months". */
export const breathingRoomPhrase = (months: number): string => phrase(months);
