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

describe("<BudgetDashboard /> month-to-date actuals", () => {
  const withoutActuals = [
    income,
    entry({}),
    entry({ id: "e2", category: "expenses", name: "Dining", amount: 500, isEssential: false }),
  ];

  it("does not render MTD Settled Actuals when no entry has actuals", () => {
    customRender(<BudgetDashboard {...baseProps} entries={withoutActuals} />);
    expect(screen.queryByText("MTD Settled Actuals")).toBeNull();
  });

  it("never shows 92% of a £1,000 priority budget (£920)", () => {
    customRender(<BudgetDashboard {...baseProps} entries={withoutActuals} />);
    expect(screen.queryByText("£920")).toBeNull();
    expect(screen.queryByText("£390")).toBeNull();
  });

  it("shows the connect-a-bank prompt linking to /app/accounts", () => {
    customRender(<BudgetDashboard {...baseProps} entries={withoutActuals} />);
    const prompt = screen.getByText(/Actual spending is not tracked yet/);
    expect(prompt.textContent?.replace(/\s+/g, " ")).toBe(
      "Actual spending is not tracked yet. Connect a bank on Accounts to compare plan with reality.",
    );
    const link = screen.getByRole("link", { name: /accounts/i });
    expect(link.getAttribute("href")).toBe("/app/accounts");
  });

  it("renders actuals when actualMtdGbp is set and hides the prompt", () => {
    customRender(
      <BudgetDashboard
        {...baseProps}
        entries={[
          income,
          entry({ actualMtdGbp: 850 }),
          entry({
            id: "e3",
            name: "Council tax",
            category: "bills",
            amount: 150,
            actualMtdGbp: 150,
          }),
        ]}
      />,
    );
    expect(screen.getAllByText("MTD Settled Actuals").length).toBeGreaterThan(0);
    expect(screen.getByText("£1,000")).toBeTruthy();
    expect(screen.queryByText(/Actual spending is not tracked yet/)).toBeNull();
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
