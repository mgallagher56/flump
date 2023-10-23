export const monthYearSort = (
  a: {
    month?: number;
    year?: number;
  },
  b: {
    month?: number;
    year?: number;
  }
) => {
  if (a.year === b.year) {
    return a.month - b.month;
  }
  return a.year - b.year;
};
