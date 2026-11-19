// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { buildAccountRows, lastUpdatedLabel, summariseAccountBalance } from "./accountRows";

describe("buildAccountRows", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("shows the saved balance, not the latest recorded month, when they differ", () => {
    const [row] = buildAccountRows(
      [{ id: "a1", name: "Current", type: "Current", balance: 1500 }],
      [
        { account_id: "a1", month: 1, year: 2020, value: 800 },
        { account_id: "a1", month: 2, year: 2020, value: 1000 },
      ],
    );
    expect(row.balance).toBe(1500);
    // Compared with February 2020, the latest recorded month before this one.
    expect(row.changePercent).toBe(50);
    expect(row.favourable).toBe(true);
  });

  test("compares a recorded current month with the month before it", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 14));
    const [row] = buildAccountRows(
      [{ id: "a1", name: "Current", type: "Current", balance: 1000 }],
      [
        { account_id: "a1", month: 10, year: 2026, value: 800 },
        { account_id: "a1", month: 11, year: 2026, value: 1000 },
      ],
    );
    expect(row.balance).toBe(1000);
    expect(row.changePercent).toBe(25);
  });

  test("falls back to the latest recorded month when no balance is saved", () => {
    const [row] = buildAccountRows(
      [{ id: "a1", name: "Current", type: "Current" }],
      [{ account_id: "a1", month: 2, year: 2020, value: 1000 }],
    );
    expect(row.balance).toBe(1000);
  });

  test("shows a liability as the amount owed, and a falling debt as good news", () => {
    const [row] = buildAccountRows(
      [{ id: "d1", name: "Card", type: "Credit Card", balance: -1200 }],
      [{ account_id: "d1", month: 1, year: 2020, value: -1500 }],
    );
    expect(row.balance).toBe(1200);
    expect(row.changePercent).toBe(-20);
    expect(row.favourable).toBe(true);
  });

  test("falls back to the stored balance with no history", () => {
    const [row] = buildAccountRows(
      [{ id: "d1", name: "Card", type: "Credit Card", balance: -1200 }],
      [],
    );
    expect(row.balance).toBe(1200);
    expect(row.changePercent).toBeNull();
  });
});

describe("summariseAccountBalance", () => {
  const now = new Date(2026, 10, 14);
  const noId = { month: 10, year: 2026, value: 900 };

  test("a recorded month with no account id matches no account in a mixed list", () => {
    const summary = summariseAccountBalance({ id: "a1", type: "Current" }, [noId], now);
    expect(summary.balance).toBeUndefined();
    expect(summary.againstLabel).toBeNull();
  });

  test("a recorded month with no account id belongs to the account when the caller says so", () => {
    const summary = summariseAccountBalance({ id: "a1", type: "Current" }, [noId], now, true);
    expect(summary.balance).toBe(900);
    expect(summary.againstLabel).toBe("October 2026");
  });

  test("scales joint account balance and previous month by sharePercent while keeping ISAs at 100%", () => {
    const details = [{ account_id: "m1", month: 10, year: 2026, value: -200_000 }];
    const rows = buildAccountRows(
      [
        {
          id: "m1",
          name: "Joint Mortgage",
          type: "Mortgage",
          balance: -180_000,
          ownership: "joint",
          sharePercent: 50,
        },
        {
          id: "i1",
          name: "Cash ISA",
          type: "Saving",
          balance: 20_000,
          ownership: "joint",
          sharePercent: 50,
        },
      ],
      details,
      now,
    );
    expect(rows[0]).toMatchObject({
      id: "m1",
      ownership: "joint",
      sharePercent: 50,
      balance: 90_000,
      changePercent: -10,
      favourable: true,
    });
    expect(rows[1]).toMatchObject({
      id: "i1",
      ownership: "sole",
      sharePercent: 100,
      balance: 20_000,
    });
  });

  test("a recorded month for another account never matches", () => {
    const other = { account_id: "a2", month: 10, year: 2026, value: 500 };
    const summary = summariseAccountBalance({ id: "a1", type: "Current" }, [other], now, true);
    expect(summary.balance).toBeUndefined();
  });
});

describe("lastUpdatedLabel", () => {
  test("formats the latest past month in en-GB", () => {
    expect(
      lastUpdatedLabel([
        { month: 1, year: 2020, value: 1 },
        { month: 3, year: 2020, value: 2 },
      ]),
    ).toBe("March 2020");
  });
  test("is null without history", () => {
    expect(lastUpdatedLabel([])).toBeNull();
  });
});

describe("the current month is the London month, not the device's (CH-8)", () => {
  const deviceZone = process.env.TZ;
  afterEach(() => {
    process.env.TZ = deviceZone;
  });

  // 23:30 UTC on 30 June 2026 is 00:30 BST on 1 July in London, and 13:30 on 30 June in Hawaii.
  const londonFirstOfJuly = new Date(Date.UTC(2026, 5, 30, 23, 30));

  test("a device behind London still counts July's recorded month as the current month", () => {
    process.env.TZ = "Pacific/Honolulu";
    const summary = summariseAccountBalance(
      { id: "a1", type: "Current" },
      [
        { account_id: "a1", month: 6, year: 2026, value: 1000 },
        { account_id: "a1", month: 7, year: 2026, value: 1100 },
      ],
      londonFirstOfJuly,
    );
    // July is London's current month, so it is the latest figure (1100), compared with June
    // (1000): (1100 - 1000) / 1000 = 10%.
    expect(summary.balance).toBe(1100);
    expect(summary.againstLabel).toBe("June 2026");
  });

  test("lastUpdatedLabel reads July as recorded, not future, on that device", async () => {
    process.env.TZ = "Pacific/Honolulu";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(londonFirstOfJuly);
    // Load the module at this moment, so no month worked out when it loads can pass by chance.
    vi.resetModules();
    const fresh = await import("./accountRows");
    expect(fresh.lastUpdatedLabel([{ month: 7, year: 2026, value: 1100 } as never])).toBe(
      "July 2026",
    );
    vi.useRealTimers();
  });
});
