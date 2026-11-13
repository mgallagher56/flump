import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { BudgetWidget } from "./BudgetWidget";

const meta: Meta<typeof BudgetWidget> = {
  title: "3. Financial Patterns & Sections/BudgetWidget",
  component: BudgetWidget,
  parameters: { layout: "padded" },
  args: {
    data: {
      monthlyIncome: 3200,
      annualSalary: 48000,
      monthlyExpenses: 2400,
      monthlySurplus: 800,
      budgetedSavings: 300,
      livingExpenses: 2100,
      savingsRatePct: 34,
      monthsOfCover: 6.5,
    },
  },
};

export default meta;
type Story = StoryObj<typeof BudgetWidget>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("+£800")[0]).toBeDefined();
    await expect(canvas.getAllByRole("progressbar")[0]).toBeDefined();
    await expect(canvas.getAllByText("6.5 months")[0]).toBeDefined();
  },
};

export const Deficit: Story = {
  args: {
    data: {
      monthlyIncome: 2000,
      monthlyExpenses: 2300,
      monthlySurplus: -300,
      savingsRatePct: 0,
      monthsOfCover: 0.8,
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Monthly deficit")[0]).toBeDefined();
  },
};

export const NotSet: Story = {
  args: {
    data: {
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlySurplus: 0,
      savingsRatePct: 0,
      monthsOfCover: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set")[0]).toBeDefined();
    await expect(canvas.getAllByRole("link", { name: "Add your budget" })[0]).toBeDefined();
  },
};
