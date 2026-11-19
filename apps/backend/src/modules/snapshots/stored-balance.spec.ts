import { describe, expect, it } from "vitest";
import { resignHistoryForType } from "./stored-balance";

/** An in-memory history table: `find` returns the live rows, `save` records what was written. */
const historyOf = (values: number[]) => {
  const rows = values.map((value) => ({ value }));
  const saved: Array<Array<{ value: number | string }>> = [];
  return {
    rows,
    saved,
    repo: {
      find: async () => rows,
      save: async (changed: Array<{ value: number | string }>) => {
        saved.push(changed);
        return changed;
      },
    },
  };
};

describe("resignHistoryForType", () => {
  it("re-signs an asset's positive months negative when it becomes a debt", async () => {
    // Saving -> Loan: 1,200 and 1,000 are owed amounts now, stored as -1,200 and -1,000.
    const h = historyOf([1200, 1000]);
    expect(await resignHistoryForType(h.repo, "a1", "Loan", "Saving")).toBe(2);
    expect(h.rows.map((r) => r.value)).toEqual([-1200, -1000]);
  });

  it("re-signs a debt's negative months positive when it becomes an asset (CH-4)", async () => {
    // Credit Card owing 500 then 480, changed to Saving: the form re-posts today's balance as
    // +500, so past months must read +500 and +480, not -500 and -480. A 0 month stays 0.
    const h = historyOf([-500, -480, 0]);
    expect(await resignHistoryForType(h.repo, "a1", "Saving", "Credit Card")).toBe(2);
    expect(h.rows.map((r) => r.value)).toEqual([500, 480, 0]);
    expect(h.saved).toHaveLength(1);
  });

  it("leaves history alone when the type stays on the same side", async () => {
    // Loan -> Credit Card: both debts, -900 is already right. Saving -> Current: both assets, and
    // an overdrawn -50 month of an asset keeps its sign.
    const debt = historyOf([-900]);
    expect(await resignHistoryForType(debt.repo, "a1", "Credit Card", "Loan")).toBe(0);
    expect(debt.rows.map((r) => r.value)).toEqual([-900]);
    const asset = historyOf([-50, 300]);
    expect(await resignHistoryForType(asset.repo, "a1", "Current", "Saving")).toBe(0);
    expect(asset.rows.map((r) => r.value)).toEqual([-50, 300]);
    expect(asset.saved).toHaveLength(0);
  });

  it("an overdraft that becomes a current account stays overdrawn", async () => {
    // Overdraft at -500 and -320 changed to Current: an overdrawn current account is
    // still money owed, so the months keep their sign and nothing is written.
    const h = historyOf([-500, -320]);
    expect(await resignHistoryForType(h.repo, "a1", "Current", "Overdraft")).toBe(0);
    expect(h.rows.map((r) => r.value)).toEqual([-500, -320]);
    expect(h.saved).toHaveLength(0);
  });

  it("without the old type, a move to an asset changes nothing (bank sync)", async () => {
    const h = historyOf([-500]);
    expect(await resignHistoryForType(h.repo, "a1", "Saving")).toBe(0);
    expect(h.rows.map((r) => r.value)).toEqual([-500]);
  });
});
