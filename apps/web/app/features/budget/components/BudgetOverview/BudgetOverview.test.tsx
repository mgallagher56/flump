import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

const income = entry({
  id: "i1",
  category: "income",
  name: "Salary",
  amount: 3000,
  isIncome: true,
  isEssential: false,
});

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
  entry({ id: "e2", category: "expenses", name: "Dining", amount: 500, isEssential: false }),
  entry({ id: "isa", category: "savings", name: "ISA", amount: 200, isEssential: false }),
];

describe("<BudgetOverview />", () => {
  it("leads with Left over each month in the one hero, then money in and going out", () => {
    const { container } = customRender(<BudgetOverview entries={entries} />);
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(screen.getByText("Left over each month")).toBeDefined();
    // 3,000 - 1,000 - 500 - 200
    expect(container.querySelector('[data-figure="budget.surplus"]')?.textContent).toBe("£1,300");
    expect(screen.getByText("Money in each month")).toBeDefined();
    expect(screen.getByText("£3,000")).toBeDefined();
    expect(screen.getByText("Going out each month")).toBeDefined();
    // 1,000 essentials + 500 flexible + 200 savings
    expect(screen.getByText("£1,700")).toBeDefined();
    expect(screen.queryByText("Months of cover")).toBeNull();
    // Spending categories live in the list below, not in the first view.
    expect(screen.queryByText("Bills and essentials")).toBeNull();
    expect(screen.queryByText("Flexible spending")).toBeNull();
    expect(screen.queryByText("Each month")).toBeNull();
  });

  it("shows 4 figures: the hero, weekly safe to spend, money in and going out", () => {
    const picture = buildWorkspacePicture({
      userProfile: profile,
      accounts: [{ id: "s", name: "Saver", type: "Saving", balance: 6000, currency: "GBP" }],
      accountDetails: [],
      budgetEntries: entries,
    } as never);
    const { container } = customRender(<BudgetOverview entries={entries} picture={picture} />);
    expect(container.querySelector('[data-figure="monthsOfCover"]')).toBeNull();
    const figures = container.querySelectorAll(
      '[data-figure="budget.surplus"], [data-figure="safeToSpend.weekly"]',
    );
    expect(figures).toHaveLength(2);
    // The other two are money in and going out.
    expect(screen.getByText("£3,000")).toBeDefined();
    expect(screen.getByText("£1,700")).toBeDefined();
    // Two KPI cards, never more.
    expect(screen.getAllByText(/^(Money in each month|Going out each month)$/)).toHaveLength(2);
  });

  it("explains the hero only", () => {
    customRender(<BudgetOverview entries={entries} />);
    expect(screen.getByRole("button", { name: "About Left over each month" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "About Money in each month" })).toBeNull();
    expect(screen.queryByRole("button", { name: "About Going out each month" })).toBeNull();
  });

  it("asks for income and spending when there is neither, never showing 0", () => {
    const { container } = customRender(<BudgetOverview entries={[]} />);
    expect(
      screen.getByText("Add your income and spending to see money in and going out"),
    ).toBeDefined();
    expect(container.querySelector('[data-figure="monthsOfCover"]')).toBeNull();
    expect(screen.queryByText("0 months")).toBeNull();
  });

  it("shows weekly safe to spend as the hero's sub-line, from the picture", () => {
    const picture = buildWorkspacePicture({ userProfile: profile, budgetEntries: entries });
    if (picture.safeToSpend.status !== "known") throw new Error("expected known");
    const { container } = customRender(<BudgetOverview entries={entries} picture={picture} />);
    const hero = container.querySelector('[data-tone="hero"]');
    const weekly = hero?.querySelector('[data-figure="safeToSpend.weekly"]');
    expect(weekly?.textContent).toBe(
      `£${Math.round(picture.safeToSpend.value.weekly).toLocaleString("en-GB")}`,
    );
    expect(hero?.textContent).not.toMatch(/a day/);
  });

  it("asks for a salary when take-home is unknown", () => {
    customRender(<BudgetOverview entries={entries} />);
    // The global test setup renders links as their children.
    expect(
      screen.getByText(/Add your salary to see what is safe to spend each week/),
    ).toBeDefined();
  });

  it("shows income and left over as Not set without an income row, not £0", () => {
    const { container } = customRender(<BudgetOverview entries={[entry({})]} />);
    expect(container.querySelector('[data-figure="budget.surplus"]')).toBeNull();
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    expect(screen.getByText("Add your income to see what is left over each month.")).toBeDefined();
  });

  it("states a short budget plainly: no alarm, no charities, no ranking of bills", () => {
    const { container } = customRender(
      <BudgetOverview entries={[{ ...income, amount: 500 }, entry({})]} />,
    );
    expect(screen.getByText("Short each month")).toBeDefined();
    expect(container.querySelector('[data-figure="budget.surplus"]')?.textContent).toBe("£500");
    expect(screen.queryByText(/StepChange|National Debtline|Citizens Advice/)).toBeNull();
    expect(screen.queryByText(/priority bills/i)).toBeNull();
    expect(container.querySelector('[class*="danger"], [class*="warning"]')).toBeNull();
  });
});
