import { describe, expect, it } from "vitest";
import {
  CHECK_IN_DAYS,
  checkInDateForMonth,
  isCheckInDue,
  nextCheckInDate,
} from "./check-in-day.js";

describe("CHECK_IN_DAYS", () => {
  it("lists 1 to 31", () => {
    expect(CHECK_IN_DAYS).toHaveLength(31);
    expect(CHECK_IN_DAYS[0]).toBe(1);
    expect(CHECK_IN_DAYS.at(-1)).toBe(31);
  });
});

describe("checkInDateForMonth", () => {
  it("uses the chosen day, and the 1st when none is chosen", () => {
    expect(checkInDateForMonth("2026-11", 28)).toBe("2026-11-28");
    expect(checkInDateForMonth("2026-11", null)).toBe("2026-11-01");
    expect(checkInDateForMonth("2026-11", undefined)).toBe("2026-11-01");
  });

  it("falls on the last day in shorter months", () => {
    expect(checkInDateForMonth("2026-02", 31)).toBe("2026-02-28");
    expect(checkInDateForMonth("2026-04", 31)).toBe("2026-04-30");
    expect(checkInDateForMonth("2026-02", 29)).toBe("2026-02-28");
    expect(checkInDateForMonth("2026-12", 31)).toBe("2026-12-31");
  });

  it("uses 29 February in a leap year", () => {
    expect(checkInDateForMonth("2028-02", 31)).toBe("2028-02-29");
    expect(checkInDateForMonth("2028-02", 29)).toBe("2028-02-29");
  });

  it("reads an out-of-range day as the 1st and throws on a bad month", () => {
    expect(checkInDateForMonth("2026-11", 0)).toBe("2026-11-01");
    expect(checkInDateForMonth("2026-11", 32)).toBe("2026-11-01");
    expect(() => checkInDateForMonth("2026-13", 1)).toThrow();
  });
});

describe("isCheckInDue", () => {
  it("is never due once this month is recorded", () => {
    expect(isCheckInDue({ today: "2026-11-30", checkInDay: 1, lastRecordedMonth: "2026-11" })).toBe(
      false,
    );
  });

  it("is always due when nothing has ever been recorded", () => {
    expect(isCheckInDue({ today: "2026-11-02", checkInDay: 28, lastRecordedMonth: null })).toBe(
      true,
    );
  });

  it("waits for the chosen day when last month was recorded", () => {
    const base = { checkInDay: 28, lastRecordedMonth: "2026-10" };
    expect(isCheckInDue({ ...base, today: "2026-11-27" })).toBe(false);
    expect(isCheckInDue({ ...base, today: "2026-11-28" })).toBe(true);
    expect(isCheckInDue({ ...base, today: "2026-11-30" })).toBe(true);
  });

  it("is due from the 1st when no day is chosen", () => {
    expect(
      isCheckInDue({ today: "2026-11-01", checkInDay: null, lastRecordedMonth: "2026-10" }),
    ).toBe(true);
  });

  it("is due straight away when last month was not recorded either", () => {
    expect(
      isCheckInDue({ today: "2026-11-05", checkInDay: 28, lastRecordedMonth: "2026-09" }),
    ).toBe(true);
  });

  it("uses the last day of a short month for a day 31 choice", () => {
    const base = { checkInDay: 31, lastRecordedMonth: "2027-01" };
    expect(isCheckInDue({ ...base, today: "2027-02-27" })).toBe(false);
    expect(isCheckInDue({ ...base, today: "2027-02-28" })).toBe(true);
  });
});

describe("nextCheckInDate", () => {
  it("is this month's date while this month is not recorded and the date is ahead", () => {
    expect(
      nextCheckInDate({ today: "2026-11-05", checkInDay: 28, lastRecordedMonth: "2026-10" }),
    ).toBe("2026-11-28");
  });

  it("is next month's date once this month is recorded", () => {
    expect(
      nextCheckInDate({ today: "2026-11-05", checkInDay: 28, lastRecordedMonth: "2026-11" }),
    ).toBe("2026-12-28");
    expect(
      nextCheckInDate({ today: "2026-11-18", checkInDay: null, lastRecordedMonth: "2026-11" }),
    ).toBe("2026-12-01");
  });

  it("is next month's date once this month's date has passed", () => {
    expect(
      nextCheckInDate({ today: "2026-11-29", checkInDay: 28, lastRecordedMonth: "2026-10" }),
    ).toBe("2026-12-28");
  });

  it("falls on the last day of a shorter next month", () => {
    expect(
      nextCheckInDate({ today: "2027-01-31", checkInDay: 31, lastRecordedMonth: "2027-01" }),
    ).toBe("2027-02-28");
  });
});
