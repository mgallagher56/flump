import { describe, expect, it } from "vitest";
import {
  classifyUkTaxYear,
  formatTaxYearLabel,
  getFirstUnsupportedUkTaxYear,
  getUkTaxYearContext,
  getUkTaxYearForDate,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year.js";

// The engine supports 2020/21 to 2027/28 (types.ts SUPPORTED_UK_TAX_YEARS), so the latest
// supported year is 2027/28 (provisional) and the first year it lacks is 2028/29.

function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error("expected the call to throw");
}

describe("UnsupportedUkTaxYearError", () => {
  it("names itself so callers can tell it from other errors", () => {
    expect(new UnsupportedUkTaxYearError("2019/20").name).toBe("UnsupportedUkTaxYearError");
  });

  it("lists every supported year, comma separated, when the whole year is unsupported", () => {
    const err = new UnsupportedUkTaxYearError("2019/20");
    expect(err.message).toContain('"2019/20"');
    expect(err.message).toContain(
      "2020/21, 2021/22, 2022/23, 2023/24, 2024/25, 2025/26, 2026/27, 2027/28",
    );
    expect(err.table).toBeUndefined();
  });

  it("names the missing table and the year when only one table is missing", () => {
    const err = new UnsupportedUkTaxYearError("2026/27", "student loan");
    expect(err.message).toContain("student loan");
    expect(err.message).toContain('"2026/27"');
    expect(err.table).toBe("student loan");
  });
});

describe("getUkTaxYearForDate input checks", () => {
  it("rejects a date with text before the year", () => {
    expect(() => getUkTaxYearForDate("x2026-04-06")).toThrow(RangeError);
  });

  it("rejects month 00 and day 00", () => {
    expect(() => getUkTaxYearForDate("2026-00-15")).toThrow(RangeError);
    expect(() => getUkTaxYearForDate("2026-05-00")).toThrow(RangeError);
  });
});

describe("getFirstUnsupportedUkTaxYear", () => {
  it("is the year straight after 2027/28", () => {
    // 2027 + 1 = 2028, label 2028/29.
    expect(getFirstUnsupportedUkTaxYear()).toBe("2028/29");
  });
});

describe("getUkTaxYearContext", () => {
  it("uses the clock's own year, with no fallback, inside the supported range", () => {
    // 1 July 2025 is after 6 April 2025, so tax year 2025/26.
    expect(getUkTaxYearContext(new Date("2025-07-01T12:00:00Z"))).toEqual({
      calendarYear: "2025/26",
      ratesYear: "2025/26",
      isFallback: false,
    });
  });

  it("marks 2027/28 as provisional, with its own rates and no fallback", () => {
    expect(getUkTaxYearContext(new Date("2027-06-01T12:00:00Z"))).toEqual({
      calendarYear: "2027/28",
      ratesYear: "2027/28",
      isFallback: false,
      kind: "provisional",
    });
  });

  it("falls back to 2027/28 rates, and says why, once the clock is in 2028/29", () => {
    expect(getUkTaxYearContext(new Date("2028-06-01T12:00:00Z"))).toEqual({
      calendarYear: "2028/29",
      ratesYear: "2027/28",
      isFallback: true,
      reason: "after-latest-supported",
    });
  });

  it("falls back for any year after the latest, not only the next one", () => {
    // 1 June 2030 is in tax year 2030/31.
    const ctx = getUkTaxYearContext(new Date("2030-06-01T12:00:00Z"));
    expect(ctx.calendarYear).toBe("2030/31");
    expect(ctx.ratesYear).toBe("2027/28");
    expect(ctx.isFallback).toBe(true);
  });

  it("throws before the earliest supported year rather than falling back", () => {
    // 1 June 2019 is in tax year 2019/20, before 2020/21.
    const err = caught(() => getUkTaxYearContext(new Date("2019-06-01T12:00:00Z")));
    expect(err).toBeInstanceOf(UnsupportedUkTaxYearError);
    expect((err as UnsupportedUkTaxYearError).year).toBe("2019/20");
  });
});

describe("classifyUkTaxYear", () => {
  it("treats every supported year as supported", () => {
    expect(classifyUkTaxYear("2020/21")).toEqual({ kind: "supported" });
    expect(classifyUkTaxYear("2026/27")).toEqual({ kind: "supported" });
    expect(classifyUkTaxYear("2027/28")).toEqual({ kind: "supported" });
  });

  it("lets only the year after the latest use the latest rates", () => {
    expect(classifyUkTaxYear("2028/29")).toEqual({ kind: "fallback", ratesYear: "2027/28" });
  });

  it("rejects later years as too far ahead", () => {
    expect(classifyUkTaxYear("2029/30")).toEqual({ kind: "unsupported", reason: "too-far-ahead" });
  });

  it("rejects earlier years as before the earliest", () => {
    expect(classifyUkTaxYear("2019/20")).toEqual({
      kind: "unsupported",
      reason: "before-earliest",
    });
    // 1999 + 1 = 2000, and 2000 mod 100 = 0, so "1999/00" is well formed.
    expect(classifyUkTaxYear("1999/00")).toEqual({
      kind: "unsupported",
      reason: "before-earliest",
    });
  });

  it("rejects labels that are not YYYY/YY with consecutive years as malformed", () => {
    const malformed = { kind: "unsupported", reason: "malformed" };
    for (const label of [
      "2027-28",
      "2027/29",
      "2027/27",
      "27/28",
      "2027/2028",
      "2027/8",
      "x2027/28",
      "2027/28x",
      "abcd/ef",
      "",
    ]) {
      expect(classifyUkTaxYear(label), label).toEqual(malformed);
    }
  });
});

describe("formatTaxYearLabel", () => {
  it("returns the label unchanged by default", () => {
    expect(formatTaxYearLabel("2026/27")).toBe("2026/27");
    expect(formatTaxYearLabel("2026/27", false)).toBe("2026/27");
  });

  it("spells out 6 April to 5 April when asked for the long form", () => {
    expect(formatTaxYearLabel("2026/27", true)).toBe("6 April 2026 to 5 April 2027");
  });
});
