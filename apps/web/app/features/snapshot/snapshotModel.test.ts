import { DEFAULT_NET_WORTH_BASIS } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import {
  addMonths,
  formatMonth,
  historyCountLabel,
  buildSnapshotHistory as historyFor,
  historySourceLabel,
  latestRecordedMonth,
  londonMonth,
  nextCheckInDate,
  projectFromSnapshot,
  toChartPoints,
} from "./snapshotModel";

// These tests cover the default net worth choices; the choices themselves are tested below.
// The check-in list form (`buildCheckInRows`, `buildSnapshotPayload`) is tested in the engine.
type Args<F extends (...a: never[]) => unknown> = Parameters<F>;
const buildSnapshotHistory = (
  accounts: Args<typeof historyFor>[0],
  details: Args<typeof historyFor>[1],
  current: string,
) => historyFor(accounts, details, current, DEFAULT_NET_WORTH_BASIS);

const CURRENT = "a0000000-0000-4000-8000-000000000001";
const ISA = "a0000000-0000-4000-8000-000000000002";
const MORTGAGE = "a0000000-0000-4000-8000-000000000003";
const BANK = "a0000000-0000-4000-8000-000000000004";

const accounts = [
  { id: CURRENT, name: "Current account", type: "Current", balance: 1500 },
  { id: ISA, name: "Stocks ISA", type: "ISA", balance: 20000 },
  { id: MORTGAGE, name: "Mortgage", type: "Mortgage", balance: -180000 },
  { id: BANK, name: "Joint account", type: "Current", balance: 900, connectionId: "c1" },
];

/** The same accounts with no saved balance, for tests about recorded months only. */
const historyOnly = accounts.map(({ balance: _balance, ...account }) => account);

const row = (accountId: string, year: number, month: number, value: number) => ({
  accountId,
  year,
  month,
  value,
});

describe("month helpers", () => {
  it("uses the Europe/London month, so 00:30 BST on the 1st is the new month", () => {
    // 2026-10-01 00:30 BST is 2026-09-30 23:30 UTC.
    expect(londonMonth(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10");
    // In GMT, midnight London is midnight UTC.
    expect(londonMonth(new Date("2026-11-30T23:30:00Z"))).toBe("2026-11");
  });

  it("adds months across a year end and formats them in en-GB", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(formatMonth("2026-11")).toBe("November 2026");
    expect(nextCheckInDate("2026-11")).toBe("1 December 2026");
  });

  it("counts history neutrally", () => {
    expect(historyCountLabel(1)).toBe("1 month of history");
    expect(historyCountLabel(14)).toBe("14 months of history");
  });

  it("finds the latest recorded month", () => {
    expect(latestRecordedMonth([])).toBeNull();
    expect(latestRecordedMonth([row(CURRENT, 2025, 12, 1), row(ISA, 2026, 2, 1)])).toBe("2026-02");
  });
});

describe("buildSnapshotHistory", () => {
  it("has no stage without records", () => {
    const h = buildSnapshotHistory(accounts, [], "2026-11");
    expect(h.stage).toBe("none");
    expect(h.recordedMonths).toBe(0);
    expect(h.latestRecorded).toBeNull();
  });

  it("one recorded month is the single stage, even when the current month is carried", () => {
    const h = buildSnapshotHistory(accounts, [row(CURRENT, 2026, 10, 1000)], "2026-11");
    expect(h.stage).toBe("single");
    expect(h.series.map((p) => p.month)).toEqual(["2026-10", "2026-11"]);
    expect(h.series[1]?.allCarried).toBe(true);
    expect(h.latestRecorded?.month).toBe("2026-10");
  });

  it("two recorded months give deltas between them, not against a carried month", () => {
    const h = buildSnapshotHistory(
      accounts,
      [row(CURRENT, 2026, 9, 1000), row(CURRENT, 2026, 10, 1400)],
      "2026-11",
    );
    expect(h.stage).toBe("pair");
    expect(h.previousRecorded?.month).toBe("2026-09");
    expect(h.latestRecorded?.month).toBe("2026-10");
    expect(h.accountChanges).toEqual([
      expect.objectContaining({ accountId: CURRENT, previous: 1000, current: 1400, change: 400 }),
    ]);
  });

  it("a falling mortgage balance is a negative change, and net worth rises by the same amount", () => {
    const h = buildSnapshotHistory(
      historyOnly,
      [
        row(CURRENT, 2026, 8, 1000),
        row(MORTGAGE, 2026, 8, -181000),
        row(CURRENT, 2026, 9, 1000),
        row(MORTGAGE, 2026, 9, -180500),
        row(CURRENT, 2026, 10, 1000),
        // Stored with the wrong sign: still read as the amount owed.
        row(MORTGAGE, 2026, 10, 180000),
      ],
      "2026-10",
    );
    expect(h.stage).toBe("trend");
    const mortgage = h.accountChanges.find((c) => c.accountId === MORTGAGE);
    expect(mortgage).toMatchObject({ isLiability: true, previous: 180500, current: 180000 });
    expect(mortgage?.change).toBe(-500);
    expect(h.monthChanges[0]).toMatchObject({ month: "2026-10", change: 500 });
  });

  it("a growing card balance is a positive change for the account and lowers net worth", () => {
    const CARD = "a0000000-0000-4000-8000-000000000005";
    const withCard = [
      ...historyOnly,
      { id: CARD, name: "Card", type: "Credit Card", balance: -450 },
    ];
    const h = buildSnapshotHistory(
      withCard,
      [row(CARD, 2026, 9, -300), row(CARD, 2026, 10, -450)],
      "2026-10",
    );
    expect(h.accountChanges[0]).toMatchObject({ accountId: CARD, change: 150 });
    expect(h.monthChanges[0]?.change).toBe(-150);
  });

  it("lists what you own first, then what you owe, each by name", () => {
    const ids = ["c1", "c2", "c3", "c4"].map((n) => `a0000000-0000-4000-8000-0000000000${n}`);
    const [card, savings, loan, current] = ids as [string, string, string, string];
    const mixed = [
      { id: card, name: "Amex", type: "Credit Card", balance: -300 },
      { id: savings, name: "Savings", type: "Saving", balance: 5000 },
      { id: loan, name: "Car loan", type: "Loan", balance: -8000 },
      { id: current, name: "Current account", type: "Current", balance: 1000 },
    ];
    const h = buildSnapshotHistory(
      mixed,
      ids.flatMap((id, i) => [row(id, 2026, 9, (i + 1) * 100), row(id, 2026, 10, (i + 1) * 110)]),
      "2026-10",
    );
    expect(h.accountChanges.map((c) => c.name)).toEqual([
      "Current account",
      "Savings",
      "Amex",
      "Car loan",
    ]);
  });

  it("labels a confirmed figure Confirmed and a calculated one Calculated", () => {
    expect(historySourceLabel("confirmed")).toBe("Confirmed");
    expect(historySourceLabel("calculated")).toBe("Calculated");
    expect(historySourceLabel(null)).toBeUndefined();
  });

  it("lists month changes newest first and flags carried and new-account months", () => {
    const h = buildSnapshotHistory(
      historyOnly,
      [row(CURRENT, 2026, 6, 1000), row(CURRENT, 2026, 8, 1200), row(ISA, 2026, 8, 5000)],
      "2026-09",
    );
    expect(h.monthChanges.map((m) => m.month)).toEqual(["2026-09", "2026-08", "2026-07"]);
    expect(h.monthChanges[0]).toMatchObject({ allCarried: true, change: 0 });
    expect(h.monthChanges[1]).toMatchObject({ addedAccounts: 1, change: 5200 });
    expect(h.monthChanges[2]).toMatchObject({ allCarried: true });
  });
});

describe("buildSnapshotHistory with saved balances", () => {
  it("ends the current month on the saved balances, so it matches net worth, and keeps it not recorded", () => {
    // Recorded October values differ from today's saved balances; ISA and the joint account
    // have no history at all.
    const h = buildSnapshotHistory(
      accounts,
      [row(CURRENT, 2026, 10, 1000), row(MORTGAGE, 2026, 10, -181000)],
      "2026-11",
    );
    expect(h.latest?.month).toBe("2026-11");
    expect(h.latest?.allCarried).toBe(true);
    expect(h.latest?.netWorth).toBe(1500 + 20000 - 180000 + 900);
    expect(h.latestRecorded?.month).toBe("2026-10");
    expect(h.latestRecorded?.netWorth).toBe(1000 - 181000);
  });

  it("a recorded current month keeps its recorded value", () => {
    const h = buildSnapshotHistory(
      [{ id: CURRENT, name: "Current account", type: "Current", balance: 1500 }],
      [row(CURRENT, 2026, 10, 1000), row(CURRENT, 2026, 11, 1500)],
      "2026-11",
    );
    expect(h.latest).toMatchObject({ month: "2026-11", netWorth: 1500, allCarried: false });
  });
});

describe("toChartPoints", () => {
  it("draws recorded months solid and bridges carried months with a dashed series", () => {
    const h = buildSnapshotHistory(
      historyOnly,
      [row(CURRENT, 2026, 6, 1000), row(CURRENT, 2026, 7, 1100), row(CURRENT, 2026, 9, 1300)],
      "2026-09",
    );
    const points = toChartPoints(h.series);
    expect(points.map((p) => p.recorded)).toEqual([1000, 1100, null, 1300]);
    expect(points.map((p) => p.carried)).toEqual([null, 1100, 1100, 1300]);
  });
});

describe("projectFromSnapshot", () => {
  it("projects the saved surplus forward and returns nothing when it is unknown", () => {
    const p = projectFromSnapshot({ month: "2026-11", netWorth: 1000 }, 250, 2);
    expect(p.map((x) => [x.month, x.projected])).toEqual([
      ["2026-11", 1000],
      ["2026-12", 1250],
      ["2027-01", 1500],
    ]);
    expect(projectFromSnapshot({ month: "2026-11", netWorth: 1000 }, null)).toEqual([]);
  });
});

describe("net worth choices", () => {
  const LOAN = "a0000000-0000-4000-8000-000000000005";
  const withLoan = [
    ...accounts,
    { id: LOAN, name: "Student loan", type: "Student Loan", balance: -25000 },
  ];
  const BOTH_ON = { countProperty: true, countStudentLoan: true };
  const BOTH_OFF = { countProperty: false, countStudentLoan: false };

  it("the history's current month follows the choices", () => {
    const latest = (basis: typeof BOTH_ON) =>
      historyFor(withLoan, [row(CURRENT, 2026, 10, 1000)], "2026-11", basis).latest?.netWorth;
    // 1,500 + 20,000 + 900, less the mortgage and the loan as each choice says.
    expect(latest(DEFAULT_NET_WORTH_BASIS)).toBe(22400 - 180000);
    expect(latest(BOTH_ON)).toBe(22400 - 180000 - 25000);
    expect(latest(BOTH_OFF)).toBe(22400);
  });
});
