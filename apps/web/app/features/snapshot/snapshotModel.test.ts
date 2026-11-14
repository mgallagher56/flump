import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildCheckInRows,
  buildSnapshotHistory,
  buildSnapshotPayload,
  formatMonth,
  historyCountLabel,
  latestRecordedMonth,
  londonMonth,
  nextCheckInDate,
  projectFromSnapshot,
  toChartPoints,
} from "./snapshotModel";

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

describe("buildCheckInRows", () => {
  const details = [
    row(CURRENT, 2026, 10, 1200),
    row(ISA, 2026, 9, 19000),
    row(MORTGAGE, 2026, 10, -181000),
    row(BANK, 2026, 11, 950),
  ];

  it("prefills last month's value and marks each account's state", () => {
    const rows = buildCheckInRows(accounts, details, "2026-11", "2026-11");
    const by = Object.fromEntries(rows.map((r) => [r.accountId, r]));
    expect(by[CURRENT]).toMatchObject({
      status: "notUpdated",
      lastRecordedMonth: "2026-10",
      prefill: 1200,
    });
    expect(by[ISA]).toMatchObject({ status: "notUpdated", lastRecordedMonth: "2026-09" });
    expect(by[BANK]).toMatchObject({ status: "connected", isConnected: true, prefill: 950 });
  });

  it("shows a liability as the amount owed, positive", () => {
    const rows = buildCheckInRows(accounts, details, "2026-11", "2026-11");
    expect(rows.find((r) => r.accountId === MORTGAGE)).toMatchObject({
      isLiability: true,
      prefill: 181000,
    });
  });

  it("uses the month's own value when it is already recorded", () => {
    const rows = buildCheckInRows(
      accounts,
      [...details, row(CURRENT, 2026, 11, 1600)],
      "2026-11",
      "2026-11",
    );
    expect(rows.find((r) => r.accountId === CURRENT)).toMatchObject({
      status: "recorded",
      prefill: 1600,
    });
  });

  it("falls back to the current balance only for the current month", () => {
    const current = buildCheckInRows(accounts, [], "2026-11", "2026-11");
    expect(current.find((r) => r.accountId === ISA)).toMatchObject({
      status: "noHistory",
      prefill: 20000,
    });
    // Back-filling a month before any record never copies today's balance into the past.
    const past = buildCheckInRows(accounts, details, "2024-03", "2026-11");
    expect(past.find((r) => r.accountId === ISA)?.prefill).toBeNull();
  });

  it("matches account ids whatever their case", () => {
    const rows = buildCheckInRows(
      accounts,
      [{ account_id: CURRENT.toUpperCase(), year: 2026, month: 10, value: "1200.50" }],
      "2026-11",
      "2026-11",
    );
    expect(rows.find((r) => r.accountId === CURRENT)?.prefill).toBe(1200.5);
  });
});

describe("buildSnapshotPayload", () => {
  const rows = buildCheckInRows(accounts, [], "2026-11", "2026-11");

  it("sends every manual account, leaves connected ones to the sync, and completes the month", () => {
    const { payload, saved, skipped } = buildSnapshotPayload(
      rows,
      { [CURRENT]: 1500, [ISA]: 20100, [MORTGAGE]: 179500, [BANK]: 1 },
      { isCurrentMonth: true },
    );
    expect(saved).toBe(3);
    expect(skipped).toBe(0);
    expect(payload.complete).toBe(true);
    expect(payload.values.map((v) => v.accountId)).not.toContain(BANK);
    // The amount owed goes up positive; the backend signs it by account type (E30 D18).
    expect(payload.values.find((v) => v.accountId === MORTGAGE)?.value).toBe(179500);
  });

  it("allows a partial save: empty fields are skipped and the month is not marked complete", () => {
    const { payload, saved, skipped } = buildSnapshotPayload(
      rows,
      { [CURRENT]: 1500, [ISA]: null, [MORTGAGE]: undefined },
      { isCurrentMonth: true },
    );
    expect(saved).toBe(1);
    expect(skipped).toBe(2);
    expect(payload).toEqual({ values: [{ accountId: CURRENT, value: 1500 }] });
  });

  it("never marks a back-filled month complete, and rounds to pence", () => {
    const { payload } = buildSnapshotPayload(
      rows,
      { [CURRENT]: 10.005, [ISA]: 1, [MORTGAGE]: -2 },
      { isCurrentMonth: false },
    );
    expect(payload.complete).toBeUndefined();
    expect(payload.values.find((v) => v.accountId === CURRENT)?.value).toBe(10.01);
    expect(payload.values.find((v) => v.accountId === MORTGAGE)?.value).toBe(2);
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
