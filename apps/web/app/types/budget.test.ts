import { describe, expect, it } from "vitest";
import {
  type BudgetEntry,
  CATEGORY_COLOURS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  getCategoryColour,
  getCategoryIcon,
  getCategoryLabel,
  getDaysUntilContractEnd,
  isPriorityBill,
  toMonthly,
} from "./budget";

const makeEntry = (overrides: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: "b1",
  userId: "u1",
  category: "bills",
  name: "Broadband",
  amount: 120,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential: true,
  notes: null,
  isDefault: false,
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

describe("budget types & helpers", () => {
  it("identifies priority bills accurately", () => {
    expect(isPriorityBill(makeEntry({ isIncome: true, category: "housing" }))).toBe(false);
    expect(isPriorityBill(makeEntry({ category: "housing", name: "Apartment" }))).toBe(true);
    expect(isPriorityBill(makeEntry({ category: "bills", name: "Council Tax" }))).toBe(true);
    expect(isPriorityBill(makeEntry({ category: "expenses", name: "Netflix" }))).toBe(false);
  });

  it("computes days until contract end", () => {
    expect(getDaysUntilContractEnd(null)).toBeNull();
    expect(getDaysUntilContractEnd("not-a-date")).toBeNull();
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDaysUntilContractEnd(future)).toBeGreaterThanOrEqual(9);
  });

  it("converts monthly, annual, and weekly amounts to monthly", () => {
    expect(toMonthly(makeEntry({ amount: 120, frequency: "monthly" }))).toBe(120);
    expect(toMonthly(makeEntry({ amount: 1200, frequency: "annual" }))).toBe(100);
    expect(toMonthly(makeEntry({ amount: 120, frequency: "weekly" }))).toBeCloseTo(520, 2);
    expect(toMonthly(makeEntry({ amount: Number.NaN, frequency: "monthly" }))).toBe(0);
  });

  it("resolves category labels, colours, and icons for base and custom categories", () => {
    expect(getCategoryLabel("housing")).toBe("Housing");
    expect(getCategoryLabel("pets")).toBe("Pets");
    expect(CATEGORY_LABELS.housing).toBe("Housing");
    expect(CATEGORY_LABELS.pets).toBe("Pets");

    expect(getCategoryColour("housing")).toBe("#6363f1");
    expect(getCategoryColour("pets")).toMatch(/^#/);
    expect(CATEGORY_COLOURS.pets).toMatch(/^#/);

    expect(getCategoryIcon("housing")).toBe("🏠");
    expect(getCategoryIcon("pets")).toBe("📁");
    expect(CATEGORY_ICONS.pets).toBe("📁");
  });
});
