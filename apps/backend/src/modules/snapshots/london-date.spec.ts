import { describe, expect, it } from "vitest";
import {
  compareYearMonth,
  isRealDate,
  lastDayOfMonth,
  londonDate,
  londonQuarterStart,
  londonYearMonth,
  monthKey,
  parseMonthKey,
} from "./london-date";

describe("london-date (E30 D3)", () => {
  it("uses the London calendar day, not UTC, across the BST boundary", () => {
    // 23:30 UTC on 30 June is 00:30 BST on 1 July.
    expect(londonDate(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
    expect(londonYearMonth(new Date("2026-06-30T23:30:00Z"))).toEqual({ year: 2026, month: 7 });
    // In winter London equals UTC.
    expect(londonDate(new Date("2026-12-31T23:30:00Z"))).toBe("2026-12-31");
    expect(londonDate(new Date("2027-01-01T00:00:00Z"))).toBe("2027-01-01");
  });

  it("parses and formats month keys", () => {
    expect(parseMonthKey("2026-02")).toEqual({ year: 2026, month: 2 });
    for (const bad of ["2026-2", "2026-13", "2026-00", "26-01", "2026-01-01", ""]) {
      expect(parseMonthKey(bad), bad).toBeNull();
    }
    expect(monthKey({ year: 2026, month: 3 })).toBe("2026-03");
  });

  it("finds the last day of a month, including leap years", () => {
    expect(lastDayOfMonth({ year: 2026, month: 2 })).toBe("2026-02-28");
    expect(lastDayOfMonth({ year: 2028, month: 2 })).toBe("2028-02-29");
    expect(lastDayOfMonth({ year: 2026, month: 12 })).toBe("2026-12-31");
  });

  it("validates calendar dates and compares months", () => {
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2028-02-29")).toBe(true);
    expect(isRealDate("nope")).toBe(false);
    expect(compareYearMonth({ year: 2026, month: 1 }, { year: 2025, month: 12 })).toBeGreaterThan(
      0,
    );
    expect(compareYearMonth({ year: 2026, month: 1 }, { year: 2026, month: 1 })).toBe(0);
  });
});

describe("londonQuarterStart (E35 W5)", () => {
  it("starts a quarter at midnight London time, not UTC, in summer time", () => {
    // BST began on 28 March 2027, so 31 Mar 23:30 UTC is 1 Apr 00:30 in London: the second quarter.
    expect(londonQuarterStart(new Date("2027-03-31T23:30:00Z"))).toBe("2027-04-01");
    // 22:59 UTC is 23:59 BST on 31 March: still the first quarter.
    expect(londonQuarterStart(new Date("2027-03-31T22:59:00Z"))).toBe("2027-01-01");
    // 30 Sep 23:00 UTC is 1 Oct 00:00 BST: the fourth quarter starts.
    expect(londonQuarterStart(new Date("2026-09-30T23:00:00Z"))).toBe("2026-10-01");
    expect(londonQuarterStart(new Date("2026-09-30T22:59:59Z"))).toBe("2026-07-01");
    // 30 Jun 23:00 UTC is 1 Jul 00:00 BST.
    expect(londonQuarterStart(new Date("2026-06-30T23:00:00Z"))).toBe("2026-07-01");
  });

  it("follows UTC in winter, when London is on GMT, across a year end", () => {
    expect(londonQuarterStart(new Date("2026-12-31T23:59:59Z"))).toBe("2026-10-01");
    expect(londonQuarterStart(new Date("2027-01-01T00:00:00Z"))).toBe("2027-01-01");
  });

  it("maps the middle and last month of a quarter to its first day", () => {
    expect(londonQuarterStart(new Date("2026-05-15T12:00:00Z"))).toBe("2026-04-01");
    expect(londonQuarterStart(new Date("2026-11-25T12:00:00Z"))).toBe("2026-10-01");
  });
});
