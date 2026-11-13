import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { ExpenseBreakdown, type ExpenseCategoryTotal } from "./ExpenseBreakdown";

const category = (n: number, total: number): ExpenseCategoryTotal => ({
  cat: `cat${n}`,
  label: `Category ${n}`,
  total,
  count: 1,
});

describe("<ExpenseBreakdown />", () => {
  it("caps the donut legend at six slices and groups the rest as Other", () => {
    const categories = Array.from({ length: 10 }, (_, i) => category(i + 1, 1000 - i * 50));
    customRender(
      <ExpenseBreakdown
        categories={categories}
        totalExpenses={7750}
        onNavigateToCategory={vi.fn()}
      />,
    );
    const legendItems = screen
      .getAllByRole("listitem")
      .filter((li) => li.textContent?.includes("%"));
    expect(legendItems).toHaveLength(6);
    expect(legendItems[5]?.textContent).toContain("Other");
  });

  it("does not add Other when six or fewer categories", () => {
    const categories = [category(1, 900), category(2, 600)];
    customRender(
      <ExpenseBreakdown
        categories={categories}
        totalExpenses={1500}
        onNavigateToCategory={vi.fn()}
      />,
    );
    expect(screen.queryByText("Other")).toBeNull();
    expect(
      screen.getByRole("figure", { name: "Expense breakdown by category" }).textContent,
    ).toMatch(/Monthly expenses total £1,500/);
  });

  it("opens a category from the list", () => {
    const onNavigateToCategory = vi.fn();
    customRender(
      <ExpenseBreakdown
        categories={[category(1, 900)]}
        totalExpenses={900}
        onNavigateToCategory={onNavigateToCategory}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Category 1/ }));
    expect(onNavigateToCategory).toHaveBeenCalledWith("cat1");
  });

  it("puts categories beyond eight into a drawer", () => {
    const categories = Array.from({ length: 11 }, (_, i) => category(i + 1, 500 - i));
    customRender(
      <ExpenseBreakdown
        categories={categories}
        totalExpenses={5000}
        onNavigateToCategory={vi.fn()}
      />,
    );
    expect(screen.getByText("3 more categories")).toBeDefined();
  });
});
