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
