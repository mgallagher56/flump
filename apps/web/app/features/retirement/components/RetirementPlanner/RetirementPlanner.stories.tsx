import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { RetirementPlanner } from "./RetirementPlanner";

const meta: Meta<typeof RetirementPlanner> = {
  title: "Features/Retirement/RetirementPlanner",
  component: RetirementPlanner,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof RetirementPlanner>;

const baseArgs = {
  currentAge: 42,
  accounts: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Workplace Pension",
      type: "Pension",
      balanceGbp: 95_000,
      monthlyContributionGbp: 450,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Stocks ISA",
      type: "ISA",
      balanceGbp: 30_000,
      monthlyContributionGbp: 200,
    },
  ],
  accountDetails: [
    { accountId: "11111111-1111-4111-8111-111111111111", year: 2026, month: 10, value: 94_000 },
    { accountId: "11111111-1111-4111-8111-111111111111", year: 2026, month: 11, value: 95_000 },
  ],
  budgetEntries: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      category: "essentials",
      name: "Groceries and bills",
      amount: 850,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
    },
  ],
  housing: {
    housingStatus: "own_outright" as const,
  },
  savedPlan: {
    id: "44444444-4444-4444-8444-444444444444",
    userId: "user_1",
    retirementAge: 67,
    planToAge: 90,
    target: { kind: "typed" as const, yearlyAmount: 26_000 },
    housingOverride: null,
    statePensionAge: 67,
    statePensionAnnualForecastGbp: null,
    statePensionQualifyingYears: 35,
    growthRates: { lower: 0.02, middle: 0.05, higher: 0.08 },
    inflationRate: 0.02,
    cashSavingsNominalRate: null,
    realRentGrowthRate: 0,
    excludedAccountIds: [],
    createdAt: "2026-11-16T10:00:00.000Z",
    updatedAt: "2026-11-16T10:00:00.000Z",
  },
};

export const Light: Story = {
  args: baseArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Retirement plan")).toBeInTheDocument();
    const higherBtn = canvas.getByRole("button", { name: "Higher case (8%)" });
    await userEvent.click(higherBtn);
    await expect(canvas.getAllByText(/Your target:/).length).toBeGreaterThanOrEqual(1);
  },
};

export const Dark: Story = {
  args: baseArgs,
  parameters: {
    themes: { themeOverride: "dark" },
  },
};
