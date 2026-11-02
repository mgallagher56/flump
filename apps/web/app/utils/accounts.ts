import {
  currentMonth as defaultCurrentMonth,
  currentYear as defaultCurrentYear,
} from "~/utils/utils";

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
  currentM: number = defaultCurrentMonth,
  currentY: number = defaultCurrentYear,
): boolean => {
  if (year > currentY) return true;
  if (year === currentY && month > currentM) return true;
  return false;
};
