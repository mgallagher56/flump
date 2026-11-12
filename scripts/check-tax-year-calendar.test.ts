import { describe, expect, test } from "bun:test";
import { getUkCalendarDate, getUkTaxYearForDate } from "../packages/finance-engine/src/uk-tax-year";
import {
  evaluateTaxYearCalendar,
  exitCodeFor,
  type TaxYearCalendarEntry,
} from "./lib/tax-year-calendar";

const upTo2627: TaxYearCalendarEntry[] = ["2025/26", "2026/27"].map((year) => ({
  year,
  status: "confirmed",
}));
const with2728: TaxYearCalendarEntry[] = [...upTo2627, { year: "2027/28", status: "confirmed" }];
const prov2728: TaxYearCalendarEntry[] = [...upTo2627, { year: "2027/28", status: "provisional" }];

describe("evaluateTaxYearCalendar", () => {
  test("today (12 Nov 2026) is ok", () => {
    expect(evaluateTaxYearCalendar("2026-11-12", "2026/27", upTo2627).level).toBe("ok");
  });
  test("next year missing: ok before 1 Dec, warn from 1 Dec, fail from 1 March", () => {
    expect(evaluateTaxYearCalendar("2026-11-30", "2026/27", upTo2627).level).toBe("ok");
    expect(evaluateTaxYearCalendar("2026-12-01", "2026/27", upTo2627).level).toBe("warn");
    expect(evaluateTaxYearCalendar("2027-02-28", "2026/27", upTo2627).level).toBe("warn");
    expect(evaluateTaxYearCalendar("2027-03-01", "2026/27", upTo2627).level).toBe("fail");
    expect(evaluateTaxYearCalendar("2027-04-05", "2026/27", upTo2627).level).toBe("fail");
  });
  test("1 March 2027 with 2027/28 present is ok", () => {
    expect(evaluateTaxYearCalendar("2027-03-01", "2026/27", with2728).level).toBe("ok");
  });
  test("provisional next year: ok, warn from 15 March, fail from 1 April", () => {
    expect(evaluateTaxYearCalendar("2027-03-14", "2026/27", prov2728).level).toBe("ok");
    expect(evaluateTaxYearCalendar("2027-03-15", "2026/27", prov2728).level).toBe("warn");
    expect(evaluateTaxYearCalendar("2027-03-31", "2026/27", prov2728).level).toBe("warn");
    expect(evaluateTaxYearCalendar("2027-04-01", "2026/27", prov2728).level).toBe("fail");
  });
  test("a custom confirmBy is honoured", () => {
    const reg = [
      ...upTo2627,
      { year: "2027/28", status: "provisional", confirmBy: "2027-03-20" } as const,
    ];
    expect(evaluateTaxYearCalendar("2027-03-19", "2026/27", reg).level).toBe("warn");
    expect(evaluateTaxYearCalendar("2027-03-20", "2026/27", reg).level).toBe("fail");
  });
  test("5 vs 6 April: on 6 April 2027 the current year is 2027/28 and missing is a fail", () => {
    expect(evaluateTaxYearCalendar("2027-04-05", "2026/27", with2728).level).toBe("ok");
    expect(evaluateTaxYearCalendar("2027-04-06", "2027/28", upTo2627).level).toBe("fail");
    expect(evaluateTaxYearCalendar("2027-04-06", "2027/28", with2728).level).toBe("ok");
  });
  test("current year provisional past its confirmBy fails", () => {
    const reg = [{ year: "2026/27", status: "provisional" } as const];
    expect(evaluateTaxYearCalendar("2026-11-12", "2026/27", reg).level).toBe("fail");
    const early = [{ year: "2026/27", status: "provisional", confirmBy: "2027-01-01" } as const];
    expect(evaluateTaxYearCalendar("2026-11-12", "2026/27", early).level).toBe("ok");
  });
  test("exit codes", () => {
    expect([exitCodeFor("ok"), exitCodeFor("fail"), exitCodeFor("warn")]).toEqual([0, 1, 3]);
  });
});

describe("check-tax-year-calendar CLI", () => {
  const run = (now: string) =>
    Bun.spawnSync(["bun", "scripts/check-tax-year-calendar.ts"], {
      cwd: `${import.meta.dir}/..`,
      env: { ...process.env, TAX_CALENDAR_NOW: now },
    }).exitCode;
  test("exits 0 today, 3 in December, 1 on 1 March 2027 without a 2027/28 table", () => {
    expect(run("2026-11-12T12:00:00Z")).toBe(0);
    expect(run("2026-12-02T12:00:00Z")).toBe(3);
    expect(run("2027-03-01T12:00:00Z")).toBe(1);
  });
  test("uses the Europe/London date, not UTC", () => {
    // 22:30Z on 5 April is 23:30 BST on 5 April (still 2026/27); 23:30Z is 00:30 BST on 6 April (2027/28).
    const yearAt = (iso: string) => getUkTaxYearForDate(getUkCalendarDate(new Date(iso)));
    expect(yearAt("2027-04-05T22:30:00Z")).toBe("2026/27");
    expect(yearAt("2027-04-05T23:30:00Z")).toBe("2027/28");
    // Either way 2027/28 is missing in this repo state, so the CLI fails in both.
    expect(run("2027-04-05T22:30:00Z")).toBe(1);
    expect(run("2027-04-05T23:30:00Z")).toBe(1);
  });
});
