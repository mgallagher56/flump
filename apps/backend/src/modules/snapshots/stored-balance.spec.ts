import { DEBT_ACCOUNT_TYPES } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import {
  debtBecomesAsset,
  resignHistoryForType,
  STORED_NEGATIVE_ACCOUNT_TYPES,
} from "./stored-balance";

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

  it("an overdraft that becomes a saving re-signs positive (a saving cannot be overdrawn)", async () => {
    // Overdraft at -500 and -320 changed to Saving: a saving account cannot be overdrawn, so the
    // months are money held, +500 and +320, like any other debt that becomes an asset.
    const h = historyOf([-500, -320]);
    expect(await resignHistoryForType(h.repo, "a1", "Saving", "Overdraft")).toBe(2);
    expect(h.rows.map((r) => r.value)).toEqual([500, 320]);
  });

  it("a credit card that becomes a current account stays overdrawn", async () => {
    // Credit Card owing 400 changed to Current: a card balance owed, moved to a current account,
    // is an overdrawn current account, so -400 keeps its sign and nothing is written.
    const h = historyOf([-400]);
    expect(await resignHistoryForType(h.repo, "a1", "Current", "Credit Card")).toBe(0);
    expect(h.rows.map((r) => r.value)).toEqual([-400]);
    expect(h.saved).toHaveLength(0);
  });
});

describe("debtBecomesAsset", () => {
  it("flips only when a debt moves to an asset type that cannot be overdrawn", () => {
    // Keeps its sign: any debt moving to Current (it can be overdrawn).
    expect(debtBecomesAsset("Overdraft", "Current")).toBe(false);
    expect(debtBecomesAsset("Credit Card", "Current")).toBe(false);
    // Flips: a debt moving to an asset that cannot go below zero.
    expect(debtBecomesAsset("Overdraft", "Saving")).toBe(true);
    expect(debtBecomesAsset("Loan", "Saving")).toBe(true);
    expect(debtBecomesAsset("Credit Card", "Investment")).toBe(true);
    // No flip: debt to debt, asset to anything, or no old type (bank sync).
    expect(debtBecomesAsset("Loan", "Credit Card")).toBe(false);
    expect(debtBecomesAsset("Saving", "Current")).toBe(false);
    expect(debtBecomesAsset(undefined, "Saving")).toBe(false);
  });

  it("the engine's debt list matches the stored-negative list", () => {
    expect([...DEBT_ACCOUNT_TYPES].sort()).toEqual([...STORED_NEGATIVE_ACCOUNT_TYPES].sort());
  });
});
