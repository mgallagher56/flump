import { describe, expect, it } from "vitest";
import { formatDate, formatRelativeTime, formatTaxYear } from "./date.js";

describe("formatDate", () => {
  it("formats as D Mon YYYY", () => {
    expect(formatDate("2026-11-11")).toBe("11 Nov 2026");
    expect(formatDate("2026-09-01")).toBe("1 Sep 2026");
    expect(formatDate(new Date(2026, 10, 11, 23, 30))).toBe("11 Nov 2026");
  });
  it("accepts ISO timestamps and epoch millis", () => {
    expect(formatDate(new Date(2026, 0, 5).getTime())).toBe("5 Jan 2026");
    expect(formatDate("2026-03-02T10:00:00")).toBe("2 Mar 2026");
  });
  it("returns the placeholder for missing or invalid input", () => {
    expect(formatDate(null)).toBe("Not set");
    expect(formatDate(undefined)).toBe("Not set");
    expect(formatDate("garbage")).toBe("Not set");
    expect(formatDate("2026-13-45")).toBe("Not set");
    expect(formatDate(null, { placeholder: "-" })).toBe("-");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it("formats past and future in plain English", () => {
    expect(formatRelativeTime(ago(30_000), now)).toBe("just now");
    expect(formatRelativeTime(ago(-30_000), now)).toBe("just now");
    expect(formatRelativeTime(ago(MIN), now)).toBe("1 minute ago");
    expect(formatRelativeTime(ago(5 * MIN), now)).toBe("5 minutes ago");
    expect(formatRelativeTime(ago(HOUR), now)).toBe("1 hour ago");
    expect(formatRelativeTime(ago(3 * HOUR), now)).toBe("3 hours ago");
    expect(formatRelativeTime(ago(DAY), now)).toBe("yesterday");
    expect(formatRelativeTime(ago(-DAY), now)).toBe("tomorrow");
    expect(formatRelativeTime(ago(3 * DAY), now)).toBe("3 days ago");
    expect(formatRelativeTime(ago(7 * DAY), now)).toBe("last week");
    expect(formatRelativeTime(ago(-7 * DAY), now)).toBe("next week");
    expect(formatRelativeTime(ago(14 * DAY), now)).toBe("2 weeks ago");
    expect(formatRelativeTime(ago(30 * DAY), now)).toBe("last month");
    expect(formatRelativeTime(ago(90 * DAY), now)).toBe("3 months ago");
    expect(formatRelativeTime(ago(-30 * DAY), now)).toBe("next month");
    expect(formatRelativeTime(ago(365 * DAY), now)).toBe("last year");
    expect(formatRelativeTime(ago(-365 * DAY), now)).toBe("next year");
    expect(formatRelativeTime(ago(800 * DAY), now)).toBe("2 years ago");
    expect(formatRelativeTime(ago(-2 * HOUR), now)).toBe("in 2 hours");
    expect(formatRelativeTime(ago(-5 * MIN), now)).toBe("in 5 minutes");
    expect(formatRelativeTime(ago(-MIN), now)).toBe("in 1 minute");
  });
  it("accepts strings and returns placeholder for invalid", () => {
    expect(formatRelativeTime("2026-11-12T11:00:00Z", now)).toBe("1 hour ago");
    expect(formatRelativeTime("nope", now)).toBe("Not set");
    expect(formatRelativeTime(null, now)).toBe("Not set");
  });
});

describe("formatTaxYear", () => {
  it("formats start year as YYYY/YY", () => {
    expect(formatTaxYear(2025)).toBe("2025/26");
    expect(formatTaxYear(1999)).toBe("1999/00");
    expect(formatTaxYear(2009)).toBe("2009/10");
  });
});
