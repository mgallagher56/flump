import { describe, expect, it } from "vitest";
import { checkInDateForMonth, isCheckInDue, nextCheckInDate } from "./check-in-day.js";

// Every case passes `today` explicitly, so nothing here reads the real clock.

describe("checkInDateForMonth: which saved days are usable", () => {
  it("reads a fractional day as the 1st, not as part of a date", () => {
    // Only whole days 1 to 31 are usable; 5.5 falls back to the 1st: "2026-11-01".
    expect(checkInDateForMonth("2026-11", 5.5)).toBe("2026-11-01");
  });

  it("keeps the 1st and the 31st, and reads 0 and 32 as the 1st", () => {
    // 1 is the lowest usable day; 31 is the highest, and January has 31 days.
    expect(checkInDateForMonth("2026-01", 1)).toBe("2026-01-01");
    expect(checkInDateForMonth("2026-01", 31)).toBe("2026-01-31");
    expect(checkInDateForMonth("2026-01", 0)).toBe("2026-01-01");
    expect(checkInDateForMonth("2026-01", 32)).toBe("2026-01-01");
  });

  it("rejects a month key with anything before or after it, naming the key", () => {
    expect(() => checkInDateForMonth("x2026-11", 1)).toThrow("Not a month key: x2026-11");
    expect(() => checkInDateForMonth("2026-11x", 1)).toThrow("Not a month key: 2026-11x");
    expect(() => checkInDateForMonth("2026-13", 1)).toThrow("Not a month key: 2026-13");
  });
});

describe("today must be a plain YYYY-MM-DD date", () => {
  const base = { checkInDay: 10, lastRecordedMonth: "2026-10" };

  it("rejects a date with text before or after it, naming the value", () => {
    expect(() => isCheckInDue({ ...base, today: "x2026-11-05" })).toThrow(
      "Not a date: x2026-11-05",
    );
    expect(() => isCheckInDue({ ...base, today: "2026-11-05T09:00" })).toThrow(
      "Not a date: 2026-11-05T09:00",
    );
    expect(() => nextCheckInDate({ ...base, today: "2026-11-32" })).toThrow(
      "Not a date: 2026-11-32",
    );
  });
});

describe("nextCheckInDate", () => {
  it("gives this month's date for a new user with nothing recorded", () => {
    // Nothing recorded, today the 5th, day 10: this month's date is still ahead, "2026-11-10".
    expect(nextCheckInDate({ today: "2026-11-05", checkInDay: 10, lastRecordedMonth: null })).toBe(
      "2026-11-10",
    );
  });

  it("moves to next month on the check-in day itself, as the date is no longer ahead", () => {
    // Today is 2026-11-10 and the day is 10: this month's date is not ahead of today, so the
    // next one is December's, "2026-12-10".
    expect(
      nextCheckInDate({ today: "2026-11-10", checkInDay: 10, lastRecordedMonth: "2026-10" }),
    ).toBe("2026-12-10");
  });

  it("gives this month's date the day before it", () => {
    expect(
      nextCheckInDate({ today: "2026-11-09", checkInDay: 10, lastRecordedMonth: "2026-10" }),
    ).toBe("2026-11-10");
  });
});
