import { fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import type { BudgetEntry } from "~/types/budget";
import { BudgetCategoryList, INCOME_CATEGORY, rankCategories } from "./BudgetCategoryList";

// The global setup renders links as their children; render a real anchor so link rows are found.
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

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
  it("ranks by monthly amount, largest first, leaving out income and categories with no amount", () => {
    // Owner item 33a: savings and pets hold nothing, so they are not shown as empty lines.
    expect(rankCategories(categories, entries).map((r) => r.category)).toEqual([
      "housing",
      "expenses",
      "bills",
    ]);
  });

  it("leaves out a category whose only entries are £0, such as an old ISA suggestion", () => {
    const rows = rankCategories(
      ["housing", "savings"],
      [entry({}), entry({ id: "isa", category: "savings", name: "ISA / Investments", amount: 0 })],
    );
    expect(rows.map((r) => r.category)).toEqual(["housing"]);
  });

  it("keeps empty categories at the foot for the editor", () => {
    expect(rankCategories(categories, entries, { keepEmpty: true }).map((r) => r.category)).toEqual(
      ["housing", "expenses", "bills", "savings", "pets"],
    );
  });

  it("adds a category that only exists on an entry", () => {
    const rows = rankCategories(["housing"], [entry({ category: "travel", amount: 50 })]);
    expect(rows.map((r) => r.category)).toEqual(["travel"]);
  });

  it("leaves out a custom category whose entries are all income", () => {
    const rows = rankCategories(
      ["housing", "side-work"],
      [entry({}), entry({ id: "s", category: "side-work", amount: 200, isIncome: true })],
    );
    expect(rows.map((r) => r.category)).toEqual(["housing"]);
    expect(rankCategories([INCOME_CATEGORY], [])).toEqual([]);
  });

  it("treats an entry in the income category as income even when its flag is off", () => {
    const rows = rankCategories(
      ["housing", INCOME_CATEGORY],
      [entry({}), entry({ id: "u", category: INCOME_CATEGORY, amount: 900, isIncome: false })],
    );
    expect(rows.map((r) => r.category)).toEqual(["housing"]);
    expect(rows[0]?.total).toBe(1000);
  });

  it("keeps a mixed category but counts only its spending", () => {
    const rows = rankCategories(
      ["pets"],
      [
        entry({ id: "p1", category: "pets", amount: 60 }),
        entry({ id: "p2", category: "pets", amount: 100, isIncome: true }),
      ],
    );
    expect(rows).toEqual([{ category: "pets", label: expect.any(String), total: 60, count: 1 }]);
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

  it("is titled Where your money goes", () => {
    customRender(<BudgetCategoryList {...props} />);
    expect(screen.getByRole("heading", { name: "Where your money goes" })).toBeDefined();
  });

  it("shows one figure per row, leaves income out and marks rows as list rows", () => {
    const { container } = customRender(<BudgetCategoryList {...props} />);
    const rows = container.querySelectorAll("[data-list-row]");
    expect(rows).toHaveLength(3);
    expect(screen.queryByTestId("budget-category-income")).toBeNull();
    // A category with no amount is not listed (owner item 33a).
    expect(screen.queryByTestId("budget-category-savings")).toBeNull();
    expect(screen.queryByText("£3,000")).toBeNull();
    expect(within(rows[0] as HTMLElement).getByText("£1,000")).toBeDefined();
    expect(within(rows[2] as HTMLElement).getByText("£40")).toBeDefined();
    // No entry-count line and no share bars: the amount is the row's one figure.
    expect(screen.queryByText(/\d+ entr(y|ies)|No entries yet/)).toBeNull();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("shows metaFor's line under a row's name when it returns text", () => {
    customRender(
      <BudgetCategoryList
        {...props}
        metaFor={(cat) => (cat === "housing" ? "Renting" : undefined)}
      />,
    );
    const housing = screen.getByTestId("budget-category-housing");
    expect(within(housing).getByText("Renting")).toBeDefined();
    // Rows metaFor leaves alone show their name only.
    expect(screen.getByTestId("budget-category-expenses").textContent).toBe("Expenses£400");
  });

  it("makes a row a link with hrefFor, named in full, with no entries panel", () => {
    customRender(
      <BudgetCategoryList
        {...props}
        hrefFor={(cat) =>
          cat === "housing" ? { to: "/app/mortgage", page: "mortgage page" } : undefined
        }
        metaFor={(cat) => (cat === "housing" ? "Mortgage" : undefined)}
        openCategory="housing"
      />,
    );
    const housing = screen.getByRole("link", {
      name: /^Housing\s*Mortgage\s*£1,000 a month, open the mortgage page$/,
    });
    expect(housing.getAttribute("href")).toBe("/app/mortgage");
    expect(housing.getAttribute("aria-expanded")).toBeNull();
    expect(screen.queryByText("Entries for housing")).toBeNull();
    // Other rows still open their entries.
    expect(screen.getByTestId("budget-category-expenses").getAttribute("aria-expanded")).toBe(
      "false",
    );
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

  it("marks the open category's row so it reads as the heading of its entries", () => {
    customRender(<BudgetCategoryList {...props} openCategory="housing" />);
    const open = screen.getByTestId("budget-category-housing").className;
    const closed = screen.getByTestId("budget-category-expenses").className;
    expect(open).not.toBe(closed);
  });

  it("puts Edit budget on the section's heading row when given", () => {
    const onEditBudget = vi.fn();
    customRender(<BudgetCategoryList {...props} onEditBudget={onEditBudget} />);
    const header = screen.getByTestId("budget-categories-header");
    fireEvent.click(within(header).getByRole("button", { name: "Edit budget" }));
    expect(onEditBudget).toHaveBeenCalled();
  });

  it("has one Add category button at the foot", () => {
    const onAddCategory = vi.fn();
    customRender(<BudgetCategoryList {...props} onAddCategory={onAddCategory} />);
    const buttons = screen.getAllByRole("button", { name: "Add category" });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(onAddCategory).toHaveBeenCalled();
  });

  it("shows a row's notice under it, outside its closed entries", () => {
    customRender(
      <BudgetCategoryList
        {...props}
        noticeFor={(cat) => (cat === "bills" ? <div role="note">Bills note</div> : null)}
      />,
    );
    const note = screen.getByRole("note");
    expect(note.textContent).toBe("Bills note");
    expect(note.closest("[hidden]")).toBeNull();
    expect(
      note.closest("[data-list-row]")?.contains(screen.getByTestId("budget-category-bills")),
    ).toBe(true);
  });
});
