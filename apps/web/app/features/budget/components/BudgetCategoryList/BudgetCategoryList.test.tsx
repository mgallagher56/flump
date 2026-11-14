import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import type { BudgetEntry } from "~/types/budget";
import { BudgetCategoryList, rankCategories } from "./BudgetCategoryList";

const entry = (overrides: Partial<BudgetEntry>): BudgetEntry => ({
  id: "e1",
  userId: "u1",
  category: "housing",
  name: "Rent",
  amount: 1000,
  frequency: "monthly",
  isEssential: true,
  isIncome: false,
  isPrimaryIncome: false,
  isDefault: false,
  notes: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

const entries = [
  entry({ id: "i", category: "income", name: "Salary", amount: 3000, isIncome: true }),
  entry({}),
  entry({ id: "g", category: "expenses", name: "Groceries", amount: 400 }),
  entry({ id: "b", category: "bills", name: "Water", amount: 480, frequency: "annual" }),
];

const categories = ["housing", "bills", "expenses", "savings", "income", "pets"];

describe("rankCategories", () => {
  it("ranks by monthly amount, largest first, with empty categories at the foot in order", () => {
    expect(rankCategories(categories, entries).map((r) => r.category)).toEqual([
      "income",
      "housing",
      "expenses",
      "bills",
      "savings",
      "pets",
    ]);
  });

  it("adds a category that only exists on an entry", () => {
    const rows = rankCategories(["housing"], [entry({ category: "travel", amount: 50 })]);
    expect(rows.map((r) => r.category)).toEqual(["travel", "housing"]);
  });
});

describe("<BudgetCategoryList />", () => {
  const props = {
    categories,
    entries,
    openCategory: null,
    onToggleCategory: vi.fn(),
    renderEntries: (cat: string) => <p>Entries for {cat}</p>,
    onAddCategory: vi.fn(),
  };

  it("shows one figure per row and marks rows as list rows", () => {
    const { container } = customRender(<BudgetCategoryList {...props} />);
    const rows = container.querySelectorAll("[data-list-row]");
    expect(rows).toHaveLength(6);
    expect(within(rows[0] as HTMLElement).getByText("£3,000")).toBeDefined();
    expect(within(rows[3] as HTMLElement).getByText("£40")).toBeDefined();
    expect(within(rows[5] as HTMLElement).getByText("No entries yet")).toBeDefined();
  });

  it("opens a row's entries and reports the toggle", () => {
    const onToggleCategory = vi.fn();
    const { rerender } = customRender(
      <BudgetCategoryList {...props} onToggleCategory={onToggleCategory} />,
    );
    const housing = screen.getByTestId("budget-category-housing");
    expect(housing.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(housing);
    expect(onToggleCategory).toHaveBeenCalledWith("housing");

    rerender(<BudgetCategoryList {...props} openCategory="housing" />);
    expect(screen.getByTestId("budget-category-housing").getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(screen.getByText("Entries for housing")).toBeDefined();
  });

  it("has one Add category button at the foot", () => {
    const onAddCategory = vi.fn();
    customRender(<BudgetCategoryList {...props} onAddCategory={onAddCategory} />);
    const buttons = screen.getAllByRole("button", { name: "Add category" });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(onAddCategory).toHaveBeenCalled();
  });
});
