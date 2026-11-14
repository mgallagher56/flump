import { describe, expect, it } from "vitest";
import { DEFAULT_NET_WORTH_BASIS, type NetWorthBasis } from "./net-worth-basis.js";
import { buildFinancialPicture } from "./picture/build.js";
import { profileFactsFromProfile } from "./picture/input.js";
import { PortfolioSnapshot, type RawAccount } from "./portfolio.js";
import {
  type SelectNetWorthSeriesOptions,
  type SnapshotAccount,
  type SnapshotRow,
  selectAccountDeltas,
  selectMonthDeltas,
  selectNetWorthSeries,
} from "./snapshots.js";

/** The series under today's default basis (student loans not counted). */
const seriesOf = (
  a: readonly SnapshotAccount[],
  r: readonly SnapshotRow[],
  o?: SelectNetWorthSeriesOptions,
) => selectNetWorthSeries(a, r, DEFAULT_NET_WORTH_BASIS, o);

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
    expect(seriesOf(accounts, [])).toEqual([]);
  });

  it("carries the last known value forward at read time and flags it", () => {
    const series = seriesOf(accounts, [
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
    const series = seriesOf(accounts, [row("cash", 2026, 1, 100), row("mort", 2026, 2, 5000)]);
    expect(series.map((p) => p.netWorth)).toEqual([100, -4900]);
  });

  it("extends to a later month with carried values when asked", () => {
    const series = seriesOf(accounts, [row("cash", 2026, 1, 100)], {
      through: "2026-03",
    });
    expect(series.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(series.map((p) => p.accounts[0]?.carried)).toEqual([false, true, true]);
  });

  it("marks accounts first appearing after the first month", () => {
    const series = seriesOf(accounts, [row("cash", 2026, 1, 100), row("debt", 2026, 2, 50)]);
    expect(series.map((p) => p.addedAccountIds)).toEqual([[], ["debt"]]);
  });

  it("keeps the real sign of an overdrawn asset and never uses abs on assets", () => {
    const series = seriesOf(accounts, [row("cash", 2026, 1, -250)]);
    expect(series[0]).toMatchObject({ netWorth: -250, totalAssets: 0, totalLiabilities: 250 });
  });

  it("treats liabilities as positive amounts owed whatever sign was stored", () => {
    const a = seriesOf(accounts, [row("debt", 2026, 1, 300)]);
    const b = seriesOf(accounts, [row("debt", 2026, 1, -300)]);
    expect(a[0]?.netWorth).toBe(-300);
    expect(b[0]?.netWorth).toBe(-300);
  });

  it("excludes student loans and ignores unknown accounts and invalid rows", () => {
    const series = seriesOf(accounts, [
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
    const series = seriesOf(accounts, [row("cash", 2026, 1, 1), row("cash", 2026, 1, 2)]);
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
    const mine = seriesOf(accounts, rows).map((p) => p.netWorth);
    const engine = new PortfolioSnapshot(
      accounts.map((a) => ({ ...a, balance: 0 })),
      rows.map((r) => ({ ...r })),
    )
      .getMonthlyHistory(DEFAULT_NET_WORTH_BASIS, 12)
      .map((p) => p.netWorth);
    expect(mine).toEqual(engine);
  });
});

describe("deltas (E30): current minus previous", () => {
  const series = seriesOf(accounts, [
    row("cash", 2026, 1, 1000),
    row("cash", 2026, 2, 1400),
    row("cash", 2026, 3, 900),
  ]);

  it("uses one sign convention for rises and falls", () => {
    expect(selectMonthDeltas(series).map((d) => d.netWorthChange)).toEqual([400, -500]);
  });

  it("names both months and splits assets and liabilities", () => {
    const s = seriesOf(accounts, [
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
      const s = seriesOf(accounts, [
        row("mort", 2026, 1, sign * 100000),
        row("mort", 2026, 2, sign * 99000),
      ]);
      expect(selectAccountDeltas(s[0]!, s[1]!)).toEqual([
        { accountId: "mort", change: -1000, current: 99000, previous: 100000 },
      ]);
    }
  });

  it("gives per-account changes on recorded values", () => {
    const s = seriesOf(accounts, [row("mort", 2026, 1, 100000), row("mort", 2026, 2, 99000)]);
    expect(selectAccountDeltas(s[0]!, s[1]!)).toEqual([
      { accountId: "mort", change: -1000, current: 99000, previous: 100000 },
    ]);
  });
});

describe("selectNetWorthSeries currentBalances (the current month equals the picture)", () => {
  const saved: RawAccount[] = [
    { id: "cash", name: "Current", type: "Current", balance: 1500 },
    { id: "mort", name: "Mortgage", type: "Mortgage", balance: 180000 },
    { id: "home", name: "Home", type: "Property", balance: 300000 },
    // No history at all: only the saved balance.
    { id: "isa", name: "ISA", type: "Investment", balance: 4000 },
    { id: "loan", name: "Student loan", type: "Student Loan", balance: 20000 },
  ];
  const balances = new Map(saved.map((a) => [String(a.id), Number(a.balance)]));
  const earlier = [
    row("cash", 2026, 9, 900),
    row("mort", 2026, 9, 181000),
    row("home", 2026, 9, 290000),
    row("loan", 2026, 9, 20500),
  ];
  const bases: NetWorthBasis[] = [
    { countProperty: true, countStudentLoan: false },
    { countProperty: true, countStudentLoan: true },
    { countProperty: false, countStudentLoan: false },
    { countProperty: false, countStudentLoan: true },
  ];
  const pictureNetWorth = (b: NetWorthBasis) =>
    buildFinancialPicture(
      {
        profile: profileFactsFromProfile(null),
        netWorthBasis: b,
        accounts: saved,
        details: [],
        budget: [],
      },
      { asOf: new Date("2026-11-14T00:00:00Z") },
    ).netWorth.netWorth;

  it.each(bases)("not recorded this month: the last point is the picture (%o)", (b) => {
    const s = selectNetWorthSeries(saved, earlier, b, {
      through: "2026-11",
      currentBalances: balances,
    });
    const last = s[s.length - 1]!;
    expect(last.month).toBe("2026-11");
    expect(last.netWorth).toBe(pictureNetWorth(b));
    expect(last.allCarried).toBe(true);
    expect(last.addedAccountIds).toContain("isa");
    // The month in between still carries the recorded values.
    expect(s[1]?.netWorth).toBe(s[0]?.netWorth);
  });

  it.each(bases)("recorded this month: rows win, the rest use saved balances (%o)", (b) => {
    const rows = [
      ...earlier,
      row("cash", 2026, 11, 1500),
      row("mort", 2026, 11, 180000),
      row("home", 2026, 11, 300000),
    ];
    const s = selectNetWorthSeries(saved, rows, b, {
      through: "2026-11",
      currentBalances: balances,
    });
    const last = s[s.length - 1]!;
    expect(last.netWorth).toBe(pictureNetWorth(b));
    expect(last.allCarried).toBe(false);
    expect(last.accounts.find((a) => a.accountId === "isa")?.carried).toBe(true);
  });

  it("without currentBalances the last point carries the last recorded values, as before", () => {
    const s = selectNetWorthSeries(saved, earlier, DEFAULT_NET_WORTH_BASIS, { through: "2026-11" });
    expect(s[s.length - 1]?.netWorth).toBe(900 - 181000 + 290000);
  });

  it("ignores currentBalances when through is before the last recorded month", () => {
    const s = selectNetWorthSeries(saved, earlier, DEFAULT_NET_WORTH_BASIS, {
      through: "2026-01",
      currentBalances: balances,
    });
    expect(s.map((p) => p.netWorth)).toEqual([900 - 181000 + 290000]);
  });
});
