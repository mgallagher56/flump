import { describe, expect, it } from "vitest";
import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "./portfolio.js";

const current = (balance: number, id = "cur"): RawAccount => ({
  id,
  name: "Current",
  type: "Current",
  balance,
});
const saving = (balance: number, id = "sav"): RawAccount => ({
  id,
  name: "Saving",
  type: "Saving",
  balance,
});

describe("E23 D22: current figure and history", () => {
  it("a PATCHed balance wins over the latest history row", () => {
    const snapshot = new PortfolioSnapshot(
      [saving(5000)],
      [
        { accountId: "sav", year: 2026, month: 1, value: 1000 },
        { accountId: "sav", year: 2026, month: 2, value: 2000 },
      ],
    );
    expect(snapshot.getLatestBalance("sav")).toBe(5000);
    expect(snapshot.getTotalNetWorth()).toBe(5000);
    // History keeps the recorded past figures.
    expect(snapshot.getMonthlyHistory().map((p) => p.netWorth)).toEqual([1000, 2000]);
  });

  const table: Array<{
    name: string;
    details: RawAccountDetail[];
    expected: Array<{ month: number; netWorth: number }>;
  }> = [
    {
      name: "carries the last value across a gap month",
      details: [
        { accountId: "sav", year: 2026, month: 1, value: 1000 },
        { accountId: "sav", year: 2026, month: 4, value: 1600 },
      ],
      expected: [
        { month: 1, netWorth: 1000 },
        { month: 2, netWorth: 1000 },
        { month: 3, netWorth: 1000 },
        { month: 4, netWorth: 1600 },
      ],
    },
    {
      name: "carries one account forward while another has new rows, across a year boundary",
      details: [
        { accountId: "sav", year: 2025, month: 12, value: 1000 },
        { accountId: "cur", year: 2025, month: 12, value: 200 },
        { accountId: "cur", year: 2026, month: 1, value: 300 },
      ],
      expected: [
        { month: 12, netWorth: 1200 },
        { month: 1, netWorth: 1300 },
      ],
    },
    {
      name: "counts duplicate (account, year, month) rows once, last one wins",
      details: [
        { accountId: "sav", year: 2026, month: 1, value: 1000 },
        { accountId: "sav", year: 2026, month: 1, value: 1000 },
        { accountId: "sav", year: 2026, month: 1, value: 1100 },
      ],
      expected: [{ month: 1, netWorth: 1100 }],
    },
    {
      name: "skips a row without a month",
      details: [
        { accountId: "sav", year: 2026, value: 999 } as unknown as RawAccountDetail,
        { accountId: "sav", year: 2026, month: null, value: 999 } as unknown as RawAccountDetail,
        { accountId: "sav", year: 2026, month: 13, value: 999 },
        { accountId: "sav", year: 2026, month: 2, value: 700 },
      ],
      expected: [{ month: 2, netWorth: 700 }],
    },
    {
      name: "skips a row without a year instead of defaulting to 2025",
      details: [
        { accountId: "sav", month: 1, value: 999 } as unknown as RawAccountDetail,
        { accountId: "sav", year: 2026, month: 3, value: 400 },
      ],
      expected: [{ month: 3, netWorth: 400 }],
    },
  ];

  it.each(table)("$name", ({ details, expected }) => {
    const snapshot = new PortfolioSnapshot([saving(0), current(0)], details);
    const history = snapshot.getMonthlyHistory(24);
    expect(history.map((p) => ({ month: p.month, netWorth: p.netWorth }))).toEqual(expected);
  });

  it("includes property and pension, excludes student loans", () => {
    const accounts: RawAccount[] = [
      { id: "prop", type: "Property", balance: 0 },
      { id: "pen", type: "Pension", balance: 0 },
      { id: "sl", type: "Student Loan", balance: 0 },
    ];
    const snapshot = new PortfolioSnapshot(accounts, [
      { accountId: "prop", year: 2026, month: 1, value: 200000 },
      { accountId: "pen", year: 2026, month: 1, value: 30000 },
      { accountId: "sl", year: 2026, month: 1, value: -40000 },
    ]);
    expect(snapshot.getMonthlyHistory()[0]?.netWorth).toBe(230000);
  });
});

describe("E23 D17: asset signs", () => {
  it("an overdrawn current account lowers net worth by 1500 and adds 1500 consumer debt", () => {
    const base = new PortfolioSnapshot([saving(4000)], []);
    const overdrawn = new PortfolioSnapshot([saving(4000), current(-1500)], []);

    expect(overdrawn.getTotalNetWorth()).toBe(base.getTotalNetWorth() - 1500);
    expect(overdrawn.getTotalConsumerDebt()).toBe(1500);
    expect(overdrawn.getTotalLiabilities()).toBe(1500);
    expect(overdrawn.getTotalAssets()).toBe(4000);
    expect(overdrawn.getAccount("cur")?.nominalBalance).toBe(-1500);
  });

  it("lists the overdrawn portion as an overdraft debt item", () => {
    const items = new PortfolioSnapshot([current(-1500)], []).toDebtItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "cur", type: "overdraft", balance: 1500 });
    expect(new PortfolioSnapshot([current(250)], []).toDebtItems()).toEqual([]);
  });

  it("liabilities are normalised by type whatever the stored sign", () => {
    const pos = new PortfolioSnapshot([{ id: "c", type: "Credit Card", balance: 900 }], []);
    const neg = new PortfolioSnapshot([{ id: "c", type: "Credit Card", balance: -900 }], []);
    expect(pos.getTotalNetWorth()).toBe(-900);
    expect(neg.getTotalNetWorth()).toBe(-900);
  });

  it("history keeps the real sign of an overdrawn current account", () => {
    const snapshot = new PortfolioSnapshot(
      [current(0), saving(0)],
      [
        { accountId: "cur", year: 2026, month: 1, value: -1500 },
        { accountId: "sav", year: 2026, month: 1, value: 4000 },
      ],
    );
    expect(snapshot.getMonthlyHistory()[0]).toMatchObject({
      netWorth: 2500,
      totalAssets: 4000,
      totalLiabilities: 1500,
    });
  });
});
