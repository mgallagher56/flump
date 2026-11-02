import { isFutureMonth, monthYearSort } from "./accounts";

describe("monthYearSort", () => {
  test("should sort by year", () => {
    const a = { year: 2019 };
    const b = { year: 2020 };
    expect(monthYearSort(a, b)).toEqual(-1);
    expect(monthYearSort(b, a)).toEqual(1);
  });
  test("should sort by month", () => {
    const a = { month: 1 };
    const b = { month: 2 };
    expect(monthYearSort(a, b)).toEqual(-1);
    expect(monthYearSort(b, a)).toEqual(1);
  });
  test("should sort by year and month", () => {
    const a = { year: 2019, month: 1 };
    const b = { year: 2020, month: 2 };
    expect(monthYearSort(a, b)).toEqual(-1);
    expect(monthYearSort(b, a)).toEqual(1);
  });
  test("should return 0 if equal", () => {
    const a = { year: 2019, month: 1 };
    const b = { year: 2019, month: 1 };
    expect(monthYearSort(a, b)).toEqual(0);
  });
});

describe("isFutureMonth", () => {
  test("returns true for a month in the next year", () => {
    expect(isFutureMonth(1, 2027, 11, 2026)).toBe(true);
  });

  test("returns true for a future month in the same year", () => {
    expect(isFutureMonth(12, 2026, 11, 2026)).toBe(true);
  });

  test("returns false for the current month in the same year", () => {
    expect(isFutureMonth(11, 2026, 11, 2026)).toBe(false);
  });

  test("returns false for a past month in the same year", () => {
    expect(isFutureMonth(10, 2026, 11, 2026)).toBe(false);
  });

  test("returns false for any month in a past year", () => {
    expect(isFutureMonth(12, 2025, 11, 2026)).toBe(false);
  });
});
