import { describe, expect, it } from "vitest";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { selectRecordedMonthComparison } from "./recorded-month-comparison.js";
import { selectNetWorthSeries } from "./snapshots.js";

const rec = (month: string, netWorth: number) => ({ month, netWorth, allCarried: false });
const carried = (month: string, netWorth: number) => ({ month, netWorth, allCarried: true });

describe("selectRecordedMonthComparison", () => {
  it("compares the current month with the month before when both are recorded", () => {
    const r = selectRecordedMonthComparison(
      [rec("2026-09", 1000), rec("2026-10", 1200), rec("2026-11", 1500)],
      "2026-11",
    );
    expect(r.currentMonthRecorded).toBe(true);
    expect(r.currentMonth).toEqual({ key: "2026-11", name: "November", year: 2026 });
    expect(r.recordedMonths).toBe(3);
    expect(r.comparison).toEqual({
      month: { key: "2026-11", name: "November", year: 2026 },
      previousMonth: { key: "2026-10", name: "October", year: 2026 },
      netWorth: 1500,
      previousNetWorth: 1200,
      netWorthChange: 300,
      consecutive: true,
    });
  });

  it("skips a carried current month and compares the last two recorded months", () => {
    const r = selectRecordedMonthComparison(
      [rec("2026-09", 1000), rec("2026-10", 1200), carried("2026-11", 1250)],
      "2026-11",
    );
    expect(r.currentMonthRecorded).toBe(false);
    expect(r.currentMonth.name).toBe("November");
    expect(r.comparison?.month.key).toBe("2026-10");
    expect(r.comparison?.previousMonth.key).toBe("2026-09");
    expect(r.comparison?.netWorthChange).toBe(200);
  });

  it("skips carried months between recorded ones and says the months are not consecutive", () => {
    const r = selectRecordedMonthComparison(
      [rec("2026-06", 900), carried("2026-07", 900), carried("2026-08", 900), rec("2026-09", 1100)],
      "2026-09",
    );
    expect(r.comparison?.previousMonth).toEqual({ key: "2026-06", name: "June", year: 2026 });
    expect(r.comparison?.month.name).toBe("September");
    expect(r.comparison?.consecutive).toBe(false);
    expect(r.comparison?.netWorthChange).toBe(200);
  });

  it("compares across a gap with no points at all between recorded months", () => {
    const r = selectRecordedMonthComparison([rec("2026-03", 100), rec("2026-11", 50)], "2026-11");
    expect(r.comparison?.consecutive).toBe(false);
    expect(r.comparison?.netWorthChange).toBe(-50);
  });

  it("shows no change with fewer than two recorded months", () => {
    expect(selectRecordedMonthComparison([], "2026-11")).toEqual({
      currentMonth: { key: "2026-11", name: "November", year: 2026 },
      currentMonthRecorded: false,
      recordedMonths: 0,
      comparison: null,
    });
    const one = selectRecordedMonthComparison(
      [rec("2026-10", 1000), carried("2026-11", 1000)],
      "2026-11",
    );
    expect(one.recordedMonths).toBe(1);
    expect(one.comparison).toBeNull();
    expect(one.currentMonthRecorded).toBe(false);
    const onlyCurrent = selectRecordedMonthComparison([rec("2026-11", 1000)], "2026-11");
    expect(onlyCurrent.currentMonthRecorded).toBe(true);
    expect(onlyCurrent.comparison).toBeNull();
  });

  it("never pairs a recorded month with a carried one", () => {
    const r = selectRecordedMonthComparison(
      [carried("2026-08", 5), rec("2026-09", 1000), carried("2026-10", 1000)],
      "2026-10",
    );
    expect(r.comparison).toBeNull();
  });

  it("names months across a year boundary", () => {
    const r = selectRecordedMonthComparison(
      [
        rec("2025-11", 2000),
        carried("2025-12", 2000),
        rec("2026-01", 2600),
        carried("2026-02", 2600),
      ],
      "2026-02",
    );
    expect(r.currentMonth).toEqual({ key: "2026-02", name: "February", year: 2026 });
    expect(r.comparison?.previousMonth).toEqual({ key: "2025-11", name: "November", year: 2025 });
    expect(r.comparison?.month).toEqual({ key: "2026-01", name: "January", year: 2026 });
    expect(r.comparison?.consecutive).toBe(false);
    const dec = selectRecordedMonthComparison([rec("2025-12", 1), rec("2026-01", 2)], "2026-01");
    expect(dec.comparison?.consecutive).toBe(true);
  });

  it("works with negative net worth, worded as current minus previous", () => {
    const r = selectRecordedMonthComparison(
      [rec("2026-09", -150000.1), rec("2026-10", -149500.35)],
      "2026-10",
    );
    expect(r.comparison?.netWorthChange).toBe(499.75);
    const down = selectRecordedMonthComparison(
      [rec("2026-09", -1000), rec("2026-10", -1200)],
      "2026-10",
    );
    expect(down.comparison?.netWorthChange).toBe(-200);
    const flat = selectRecordedMonthComparison([rec("2026-09", -5), rec("2026-10", -5)], "2026-10");
    expect(Object.is(flat.comparison?.netWorthChange, 0)).toBe(true);
  });

  it("ignores months after the current month and sorts unsorted input", () => {
    const r = selectRecordedMonthComparison(
      [rec("2026-12", 9999), rec("2026-10", 1200), rec("2026-09", 1000)],
      "2026-11",
    );
    expect(r.currentMonthRecorded).toBe(false);
    expect(r.comparison?.month.key).toBe("2026-10");
    expect(r.comparison?.previousMonth.key).toBe("2026-09");
  });

  it("rejects a malformed current month", () => {
    expect(() => selectRecordedMonthComparison([], "2026-13")).toThrow(RangeError);
  });

  it("reads recorded and carried months from selectNetWorthSeries, liabilities as debts", () => {
    const accounts = [
      { id: "cur", type: "Current" },
      { id: "mort", type: "Mortgage" },
    ];
    // September and October recorded, November carried (no rows): mortgage stored negative.
    const rows = [
      { accountId: "cur", year: 2026, month: 9, value: 2000 },
      { accountId: "mort", year: 2026, month: 9, value: -150000 },
      { accountId: "cur", year: 2026, month: 10, value: 2300 },
      { accountId: "mort", year: 2026, month: 10, value: 149500 },
    ];
    const series = selectNetWorthSeries(accounts, rows, DEFAULT_NET_WORTH_BASIS, {
      through: "2026-11",
    });
    const r = selectRecordedMonthComparison(series, "2026-11");
    expect(r.currentMonthRecorded).toBe(false);
    expect(r.comparison?.previousNetWorth).toBe(-148000);
    expect(r.comparison?.netWorth).toBe(-147200);
    expect(r.comparison?.netWorthChange).toBe(800);
  });
});
