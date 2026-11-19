import { londonMonthParts } from "~/utils/londonMonth";

export const monthYearSort = (
  a: {
    month?: number;
    year?: number;
  },
  b: {
    month?: number;
    year?: number;
  },
) => {
  if (a.year === b.year) {
    return (a.month ?? 0) - (b.month ?? 0);
  }
  return (a.year ?? 0) - (b.year ?? 0);
};

export const isFutureMonth = (
  month: number,
  year: number,
  currentM?: number,
  currentY?: number,
): boolean => {
  // Without a month given, "now" is the London month at the moment of the call (CH-8).
  if (currentM === undefined || currentY === undefined) {
    const london = londonMonthParts();
    currentM ??= london.month;
    currentY ??= london.year;
  }
  if (year > currentY) return true;
  if (year === currentY && month > currentM) return true;
  return false;
};
