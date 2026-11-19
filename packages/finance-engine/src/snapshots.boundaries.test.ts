import { describe, expect, it } from "vitest";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import {
  type NetWorthPoint,
  type SnapshotAccount,
  type SnapshotRow,
  selectAccountDeltas,
  selectNetWorthSeries,
} from "./snapshots.js";

const basis = DEFAULT_NET_WORTH_BASIS;
const cash: SnapshotAccount = { id: "a", type: "Current" };
const savings: SnapshotAccount = { id: "b", type: "Saving" };

const row = (accountId: string, year: number, month: number, value: number | string) =>
  ({ accountId, year, month, value }) as SnapshotRow;

describe("selectNetWorthSeries: which rows count", () => {
  it("ignores an account with an empty id, even when a row has an empty id too", () => {
    const series = selectNetWorthSeries(
      [{ id: "", type: "Current" }],
      [row("", 2026, 1, 100)],
      basis,
    );
    expect(series).toEqual([]);
  });

  it("keeps rows in 1900 and 2200 and skips 1899, 2201 and a fractional year", () => {
    // The valid year range is 1900 to 2200 inclusive.
    expect(
      selectNetWorthSeries([cash], [row("a", 1900, 1, 100)], basis).map((p) => p.month),
    ).toEqual(["1900-01"]);
    expect(
      selectNetWorthSeries([cash], [row("a", 2200, 1, 100)], basis).map((p) => p.month),
    ).toEqual(["2200-01"]);
    expect(selectNetWorthSeries([cash], [row("a", 1899, 12, 100)], basis)).toEqual([]);
    expect(selectNetWorthSeries([cash], [row("a", 2201, 1, 100)], basis)).toEqual([]);
    expect(selectNetWorthSeries([cash], [row("a", 2026.5, 1, 100)], basis)).toEqual([]);
  });

  it("skips a row whose value is null or empty, so the month carries the last figure", () => {
    // January records 100; February's row has no value, so February carries 100, not 0.
    for (const missing of [null, ""]) {
      const series = selectNetWorthSeries(
        [cash],
        [row("a", 2026, 1, 100), row("a", 2026, 2, 100), row("a", 2026, 2, missing as never)],
        basis,
      );
      // The empty February row is skipped, leaving the recorded 100 for February.
      expect(series.map((p) => p.netWorth)).toEqual([100, 100]);
    }
    for (const missing of [null, ""]) {
      const series = selectNetWorthSeries(
        [cash],
        [row("a", 2026, 1, 100), row("a", 2026, 3, 50), row("a", 2026, 2, missing as never)],
        basis,
      );
      // February has only the empty row: it carries January's 100.
      expect(series[1]).toMatchObject({ month: "2026-02", netWorth: 100, allCarried: true });
      expect(series[1]?.accounts[0]).toMatchObject({ value: 100, carried: true });
    }
  });
});

describe("selectNetWorthSeries: the through month", () => {
  const rows = [row("a", 2026, 1, 100), row("a", 2026, 2, 200)];

  it("ignores a through value that is not a plain YYYY-MM key", () => {
    // "2026-04-15" and "x2026-04" are not month keys, so the series stops at the last record.
    for (const through of ["2026-04-15", "x2026-04"]) {
      const series = selectNetWorthSeries([cash], rows, basis, { through });
      expect(series.map((p) => p.month)).toEqual(["2026-01", "2026-02"]);
    }
  });

  it("extends to through with no saved balances given", () => {
    // February's 200 carries into March and April.
    const series = selectNetWorthSeries([cash], rows, basis, { through: "2026-04" });
    expect(series.map((p) => p.netWorth)).toEqual([100, 200, 200, 200]);
  });

  it("does not use saved balances when through is before the last recorded month", () => {
    // Saved balances apply only from the last recorded month on; through is January, before
    // February, so account b (saved balance only) never enters the series.
    const series = selectNetWorthSeries([cash, savings], rows, basis, {
      through: "2026-01",
      currentBalances: new Map([["b", 5000]]),
    });
    expect(series.map((p) => p.netWorth)).toEqual([100, 200]);
    expect(series.every((p) => p.accounts.every((a) => a.accountId === "a"))).toBe(true);
  });
});

describe("selectNetWorthSeries: added accounts", () => {
  it("lists only accounts whose first figure is this month", () => {
    // a records in January and February; b first records in February.
    const series = selectNetWorthSeries(
      [cash, savings],
      [row("a", 2026, 1, 100), row("a", 2026, 2, 150), row("b", 2026, 2, 40)],
      basis,
    );
    expect(series[1]?.addedAccountIds).toEqual(["b"]);
  });

  it("does not list an account already in the series when its saved balance fills the through month", () => {
    // a records in January; in March (through) it has no row and shows its saved balance 300.
    // It was already known, so March lists no added account.
    const series = selectNetWorthSeries([cash], [row("a", 2026, 1, 100)], basis, {
      through: "2026-03",
      currentBalances: new Map([["a", 300]]),
    });
    expect(series.map((p) => p.netWorth)).toEqual([100, 100, 300]);
    expect(series[2]?.addedAccountIds).toEqual([]);
  });
});

describe("selectAccountDeltas", () => {
  const point = (accounts: NetWorthPoint["accounts"]): NetWorthPoint => ({
    month: "2026-01",
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    accounts,
    addedAccountIds: [],
    allCarried: false,
  });

  it("leaves out an account that is only in the current point", () => {
    const previous = point([{ accountId: "a", value: 100, isLiability: false, carried: false }]);
    const current = point([
      { accountId: "a", value: 130, isLiability: false, carried: false },
      { accountId: "b", value: 50, isLiability: false, carried: false },
    ]);
    // a: 130 - 100 = 30; b has no previous figure, so it is not listed.
    expect(selectAccountDeltas(previous, current)).toEqual([
      { accountId: "a", change: 30, current: 130, previous: 100 },
    ]);
  });
});
