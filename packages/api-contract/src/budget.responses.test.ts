import { describe, expect, it } from "vitest";
import {
  AddBudgetCategoryResponse,
  BudgetEntryListResponse,
  BudgetEntryResponse,
  DeleteBudgetEntryResponse,
} from "./domains/budget.js";
import { checkAgainst } from "./validate.js";

/** A budget_entries row after JSON.stringify: decimal as a number, timestamps as ISO strings. */
const entry = {
  id: "8f6c2d1e-4b3a-4c5d-9e8f-1a2b3c4d5e6f",
  userId: "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9",
  category: "housing",
  name: "Rent / Mortgage",
  amount: 1200,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential: true,
  notes: null,
  isDefault: true,
  createdAt: "2026-04-06T09:15:00.000Z",
  updatedAt: "2026-04-06T09:15:00.000Z",
};

describe("budget response schemas", () => {
  it("accepts a budget entry and a list of them", () => {
    expect(checkAgainst(BudgetEntryResponse, entry)).toEqual({ ok: true });
    expect(checkAgainst(BudgetEntryListResponse, [entry, { ...entry, notes: "Joint" }])).toEqual({
      ok: true,
    });
    expect(checkAgainst(BudgetEntryListResponse, [])).toEqual({ ok: true });
  });

  it("rejects a decimal amount sent as a string (B-05)", () => {
    expect(checkAgainst(BudgetEntryResponse, { ...entry, amount: "1200.00" }).ok).toBe(false);
  });

  it("rejects a leaked extra key in a list item", () => {
    expect(checkAgainst(BudgetEntryListResponse, [{ ...entry, deletedAt: null }]).ok).toBe(false);
  });

  it("accepts the add-category body and rejects an extra key", () => {
    const body = { success: true, categories: ["living", "pets"] };
    expect(checkAgainst(AddBudgetCategoryResponse, body)).toEqual({ ok: true });
    expect(checkAgainst(AddBudgetCategoryResponse, { ...body, userId: "x" }).ok).toBe(false);
  });

  it("accepts the delete body and rejects an extra key", () => {
    expect(checkAgainst(DeleteBudgetEntryResponse, { success: true })).toEqual({ ok: true });
    expect(checkAgainst(DeleteBudgetEntryResponse, { success: true, id: "x" }).ok).toBe(false);
  });
});
