import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import type { BudgetEntry } from "~/types/budget";
import BudgetDashboard from "./BudgetDashboard";

vi.mock("react-router", () => ({
  Link: ({ children, to, className }: any) => (
    <a className={className} href={to}>
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

const baseProps = {
  accounts: [],
  accountDetails: [],
  savingsBalance: 0,
  mortgageBalance: 0,
  onNavigateToCategory: vi.fn(),
  onNavigateToRunway: vi.fn(),
};

const income = entry({
  id: "i1",
  category: "income",
  name: "Salary",
  amount: 3000,
  isIncome: true,
  isEssential: false,
});

describe("<BudgetDashboard /> plan-only budget (no actuals)", () => {
  const entries = [
    income,
    entry({}),
    entry({ id: "e2", category: "expenses", name: "Dining", amount: 500, isEssential: false }),
  ];

  it("shows no month-to-date actuals and no connect-a-bank prompt", () => {
    customRender(<BudgetDashboard {...baseProps} entries={entries} />);
    expect(screen.queryByText("MTD Settled Actuals")).toBeNull();
    expect(screen.queryByText(/Actual spending is not tracked yet/)).toBeNull();
  });

  it("never shows 92% of a £1,000 priority budget (£920)", () => {
    customRender(<BudgetDashboard {...baseProps} entries={entries} />);
    expect(screen.queryByText("£920")).toBeNull();
    expect(screen.queryByText("£390")).toBeNull();
  });
});

describe("<BudgetDashboard /> expense chart accessibility", () => {
  it("exposes the expense breakdown as a named figure with the formatted total", () => {
    customRender(
      <BudgetDashboard
        {...baseProps}
        entries={[
          income,
          entry({}),
          entry({ id: "e2", category: "expenses", name: "Dining", amount: 500 }),
        ]}
      />,
    );

    const figure = screen.getByRole("figure", { name: "Expense breakdown by category" });
    expect(figure.textContent).toMatch(/Monthly expenses total £1,500/);
  });
});
