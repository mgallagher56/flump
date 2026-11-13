import { describe, expect, it } from "vitest";
import { PortfolioSnapshot } from "./portfolio.js";
import {
  type SnapshotRow,
  selectAccountDeltas,
  selectMonthDeltas,
  selectNetWorthSeries,
} from "./snapshots.js";

const accounts = [
  { id: "cash", type: "Current" },
  { id: "debt", type: "Credit Card" },
  { id: "mort", type: "Mortgage" },
  { id: "loan", type: "Student Loan" },
];
const row = (accountId: string, year: number, month: number, value: number): SnapshotRow => ({
  accountId,
  year,
  month,
  value,
});

describe("selectNetWorthSeries (E30)", () => {
  it("returns nothing without rows", () => {
    expect(selectNetWorthSeries(accounts, [])).toEqual([]);
  });

  it("carries the last known value forward at read time and flags it", () => {
    const series = selectNetWorthSeries(accounts, [
      row("cash", 2026, 1, 1000),
      row("debt", 2026, 1, 200),
      row("cash", 2026, 3, 1500), // February has no rows at all
    ]);
    expect(series.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(series.map((p) => p.netWorth)).toEqual([800, 800, 1300]);
    expect(series[1]!.allCarried).toBe(true);
    expect(series[1]!.accounts.every((a) => a.carried)).toBe(true);
    const march = series[2]!;
    expect(march.allCarried).toBe(false);
    expect(march.accounts.find((a) => a.accountId === "cash")?.carried).toBe(false);
    expect(march.accounts.find((a) => a.accountId === "debt")?.carried).toBe(true);
  });

  it("contributes nothing before an account's first row", () => {
    const series = selectNetWorthSeries(accounts, [
      row("cash", 2026, 1, 100),
      row("mort", 2026, 2, 5000),
    ]);
    expect(series.map((p) => p.netWorth)).toEqual([100, -4900]);
  });

  it("extends to a later month with carried values when asked", () => {
    const series = selectNetWorthSeries(accounts, [row("cash", 2026, 1, 100)], {
      through: "2026-03",
    });
    expect(series.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(series.map((p) => p.accounts[0]?.carried)).toEqual([false, true, true]);
  });

  it("marks accounts first appearing after the first month", () => {
    const series = selectNetWorthSeries(accounts, [
      row("cash", 2026, 1, 100),
      row("debt", 2026, 2, 50),
    ]);
    expect(series.map((p) => p.addedAccountIds)).toEqual([[], ["debt"]]);
  });

  it("keeps the real sign of an overdrawn asset and never uses abs on assets", () => {
    const series = selectNetWorthSeries(accounts, [row("cash", 2026, 1, -250)]);
    expect(series[0]).toMatchObject({ netWorth: -250, totalAssets: 0, totalLiabilities: 250 });
  });

  it("treats liabilities as positive amounts owed whatever sign was stored", () => {
    const a = selectNetWorthSeries(accounts, [row("debt", 2026, 1, 300)]);
    const b = selectNetWorthSeries(accounts, [row("debt", 2026, 1, -300)]);
    expect(a[0]?.netWorth).toBe(-300);
    expect(b[0]?.netWorth).toBe(-300);
  });

  it("excludes student loans and ignores unknown accounts and invalid rows", () => {
    const series = selectNetWorthSeries(accounts, [
      row("loan", 2026, 1, 40000),
      row("ghost", 2026, 1, 999),
      row("cash", 2026, 13, 5),
      row("cash", 2026, 1, Number.NaN),
      row("cash", 2026, 1, 10),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0]?.netWorth).toBe(10);
  });

  it("lets the last duplicate row win", () => {
    const series = selectNetWorthSeries(accounts, [
      row("cash", 2026, 1, 1),
      row("cash", 2026, 1, 2),
    ]);
    expect(series[0]?.netWorth).toBe(2);
  });

  it("agrees with PortfolioSnapshot.getMonthlyHistory on recorded months", () => {
    const rows = [
      row("cash", 2026, 1, 1000),
      row("debt", 2026, 1, 200),
      row("mort", 2026, 1, 90000),
      row("cash", 2026, 2, 1100),
      row("mort", 2026, 2, 89900),
    ];
    const mine = selectNetWorthSeries(accounts, rows).map((p) => p.netWorth);
    const engine = new PortfolioSnapshot(
      accounts.map((a) => ({ ...a, balance: 0 })),
      rows.map((r) => ({ ...r })),
    )
      .getMonthlyHistory(12)
      .map((p) => p.netWorth);
    expect(mine).toEqual(engine);
  });
});

describe("deltas (E30): current minus previous", () => {
  const series = selectNetWorthSeries(accounts, [
    row("cash", 2026, 1, 1000),
    row("cash", 2026, 2, 1400),
    row("cash", 2026, 3, 900),
  ]);

  it("uses one sign convention for rises and falls", () => {
    expect(selectMonthDeltas(series).map((d) => d.netWorthChange)).toEqual([400, -500]);
  });

  it("names both months and splits assets and liabilities", () => {
    const s = selectNetWorthSeries(accounts, [
      row("cash", 2026, 1, 100),
      row("debt", 2026, 1, 50),
      row("cash", 2026, 2, 100),
      row("debt", 2026, 2, 30),
    ]);
    expect(selectMonthDeltas(s)).toEqual([
      {
        month: "2026-02",
        previousMonth: "2026-01",
        netWorthChange: 20,
        assetsChange: 0,
        liabilitiesChange: -20,
      },
    ]);
  });

  it("has no delta for a single point", () => {
    expect(selectMonthDeltas(series.slice(0, 1))).toEqual([]);
  });

  it("gives the same per-account change for a liability stored negative or positive", () => {
    for (const sign of [1, -1]) {
      const s = selectNetWorthSeries(accounts, [
        row("mort", 2026, 1, sign * 100000),
        row("mort", 2026, 2, sign * 99000),
      ]);
      expect(selectAccountDeltas(s[0]!, s[1]!)).toEqual([
        { accountId: "mort", change: -1000, current: 99000, previous: 100000 },
      ]);
    }
  });

  it("gives per-account changes on recorded values", () => {
    const s = selectNetWorthSeries(accounts, [
      row("mort", 2026, 1, 100000),
      row("mort", 2026, 2, 99000),
    ]);
    expect(selectAccountDeltas(s[0]!, s[1]!)).toEqual([
      { accountId: "mort", change: -1000, current: 99000, previous: 100000 },
    ]);
  });
});
