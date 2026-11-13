import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import type { BudgetEntry } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { BudgetOverview } from "./BudgetOverview";

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

describe("<BudgetOverview /> plan-only budget (no actuals)", () => {
  const entries = [
    income,
    entry({}),
    entry({ id: "e2", category: "expenses", name: "Dining", amount: 500, isEssential: false }),
  ];

  it("shows no month-to-date actuals and no connect-a-bank prompt", () => {
    customRender(<BudgetOverview {...baseProps} entries={entries} />);
    expect(screen.queryByText("MTD Settled Actuals")).toBeNull();
    expect(screen.queryByText(/Actual spending is not tracked yet/)).toBeNull();
  });

  it("never shows 92% of a £1,000 priority budget (£920)", () => {
    customRender(<BudgetOverview {...baseProps} entries={entries} />);
    expect(screen.queryByText("£920")).toBeNull();
    expect(screen.queryByText("£390")).toBeNull();
  });

  it("has one hero, a Where you stand strip and a months of cover link", () => {
    const picture = buildWorkspacePicture({
      userProfile: {
        annualSalary: 38000,
        employmentType: "employed",
        taxRegion: "ENGLAND",
        studentLoanPlans: [],
        pensionPercent: 5,
        isSalarySacrifice: false,
      },
      budgetEntries: entries,
    });
    const { container } = customRender(
      <BudgetOverview {...baseProps} entries={entries} picture={picture} />,
    );
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Where you stand" })).toBeDefined();
    expect(screen.getByText("Left over each month")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "See your months of cover" }));
    expect(baseProps.onNavigateToRunway).toHaveBeenCalled();
  });
});

describe("<BudgetOverview /> figures come from the financial picture (E23)", () => {
  const profile = {
    annualSalary: 38000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
    pensionPercent: 5,
    isSalarySacrifice: false,
  };
  const entries = [
    income,
    entry({}),
    entry({ id: "card", category: "debt", name: "Card payment", amount: 100 }),
    entry({ id: "isa", category: "savings", name: "ISA", amount: 200, isEssential: false }),
  ];

  it("shows the picture's weekly safe to spend and the budget totals", () => {
    const picture = buildWorkspacePicture({ userProfile: profile, budgetEntries: entries });
    if (picture.safeToSpend.status !== "known") throw new Error("expected known");
    const { container } = customRender(
      <BudgetOverview {...baseProps} entries={entries} picture={picture} />,
    );
    const weekly = container.querySelector('[data-figure="safeToSpend.weekly"]');
    // Money shows whole pounds; the figure is the engine's weekly value.
    expect(weekly?.textContent).toBe(
      `£${Math.round(picture.safeToSpend.value.weekly).toLocaleString("en-GB")}`,
    );
    expect(container.querySelector('[data-figure="budget.outgoings"]')?.textContent).toBe("£1,100");
    expect(container.querySelector('[data-figure="budget.savings"]')?.textContent).toBe("£200");
  });

  it("does not guess safe to spend from names: a 'card' row in bills is just a bill", () => {
    const picture = buildWorkspacePicture({
      userProfile: profile,
      budgetEntries: [income, entry({ category: "bills", name: "Card insurance", amount: 50 })],
    });
    if (picture.safeToSpend.status !== "known") throw new Error("expected known");
    expect(picture.safeToSpend.value.commitments.debtCommitment).toBe(0);
  });

  it("shows Not set and a pay-details link when take-home is unknown", () => {
    customRender(<BudgetOverview {...baseProps} entries={entries} />);
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
    // The global test setup renders links as their children.
    expect(screen.getByText("Add your pay details")).toBeDefined();
  });
});

describe("<BudgetOverview /> deficit", () => {
  it("names the shortfall and offers debt support without telling the user what to do", () => {
    customRender(
      <BudgetOverview {...baseProps} entries={[{ ...income, amount: 500 }, entry({})]} />,
    );
    expect(screen.getByText("Monthly shortfall")).toBeDefined();
    expect(screen.getByText("Your budget spends more than you bring in")).toBeDefined();
    expect(screen.getByText("Free UK debt support")).toBeDefined();
  });
});

describe("<BudgetOverview /> expense chart accessibility", () => {
  it("exposes the expense breakdown as a named figure with the formatted total", () => {
    customRender(
      <BudgetOverview
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
