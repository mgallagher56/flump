import { compareExpensesWithAllowance } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { AllowanceComparison } from "./AllowanceComparison";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof AllowanceComparison> = {
  title: "3. Patterns/Tax/AllowanceComparison",
  component: AllowanceComparison,
  tags: ["autodocs"],
  args: {
    comparison: compareExpensesWithAllowance({
      source: "self-employed",
      taxYear: "2026/27",
      grossIncome: 12000,
      recordedExpenses: 250,
    }),
    allowanceUsedInEstimate: 1000,
  },
};

export default meta;
type Story = StoryObj<typeof AllowanceComparison>;

export const TradingAllowanceLarger: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Who cannot use the trading allowance/ }),
    );
    await expect(canvas.getByText("Income from a partnership you are a partner in.")).toBeTruthy();
  },
};

export const ExpensesLarger: Story = {
  args: {
    comparison: compareExpensesWithAllowance({
      source: "self-employed",
      taxYear: "2026/27",
      grossIncome: 20000,
      recordedExpenses: 3500,
    }),
    allowanceUsedInEstimate: 0,
  },
};

export const RentalShareWithMortgageInterest: Story = {
  args: {
    comparison: compareExpensesWithAllowance({
      source: "rental",
      taxYear: "2026/27",
      grossIncome: 12000,
      recordedExpenses: 600,
      financeCosts: 4000,
      ownershipSharePct: 50,
    }),
    allowanceUsedInEstimate: 0,
    ownershipSharePct: 50,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Mortgage interest is not in these expenses/)).toBeTruthy();
  },
};
