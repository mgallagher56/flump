/**
 * "Breathing room" wording (owner ruling 15 November 2026, STYLE-GUIDE 12.6). The figure itself is
 * the engine's `monthsOfCover` (identifiers keep that name); this file only words it. Nothing here
 * works a figure out.
 */

import {
  type BreathingRoomWording,
  describeBreathingRoom as describeWording,
  formatBreathingRoomFigure,
  breathingRoomPhrase as phrase,
} from "@flump/finance-engine";

export const BREATHING_ROOM_LABEL = "Breathing room";
export const BREATHING_ROOM_DESCRIPTION = "How long your savings would cover the essentials.";
/** Behind the info tip, never in the description. */
export const BREATHING_ROOM_DETAIL =
  "Savings means the accounts you can draw on: your current and savings accounts. The essentials are your essential spending and minimum debt payments.";
export const MONEY_TO_DRAW_ON_LABEL = "Money to draw on";

export type { BreathingRoomWording } from "@flump/finance-engine";

/**
 * "4.7 months", "1 month", "1 year 1 month", "10+ years". The wording lives in the engine
 * (`breathing-room-wording.ts`) so web, marketing and AI text read the same.
 */
export const formatMonthsOfCover = (months: number): string => formatBreathingRoomFigure(months);

/** The lead-in and the figure, for a result block: "About" and "1 year 1 month". */
export const describeBreathingRoom = (months: number): BreathingRoomWording =>
  describeWording(months) ?? { leadIn: "About", figure: formatBreathingRoomFigure(months) };

/** One phrase for a sentence or a line: "about 1.5 months", "about 1 year", "more than 10 years". */
export const breathingRoomPhrase = (months: number): string => phrase(months);
