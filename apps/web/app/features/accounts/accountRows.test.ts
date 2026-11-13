import { describe, expect, test } from "vitest";
import { buildAccountRows, lastUpdatedLabel } from "./accountRows";

describe("buildAccountRows", () => {
  test("uses the latest recorded balance and the change on the month before", () => {
    const [row] = buildAccountRows(
      [{ id: "a1", name: "Current", type: "Current", balance: 1 }],
      [
        { account_id: "a1", month: 1, year: 2020, value: 800 },
        { account_id: "a1", month: 2, year: 2020, value: 1000 },
      ],
    );
    expect(row.balance).toBe(1000);
    expect(row.changePercent).toBe(25);
    expect(row.favourable).toBe(true);
  });

  test("shows a liability as the amount owed, and a falling debt as good news", () => {
    const [row] = buildAccountRows(
      [{ id: "d1", name: "Card", type: "Credit Card", balance: -1200 }],
      [
        { account_id: "d1", month: 1, year: 2020, value: -1500 },
        { account_id: "d1", month: 2, year: 2020, value: -1200 },
      ],
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
