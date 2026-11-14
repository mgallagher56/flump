import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { BudgetWidget } from "./BudgetWidget";

const meta: Meta<typeof BudgetWidget> = {
  title: "3. Patterns/Dashboard/BudgetWidget",
  component: BudgetWidget,
  parameters: { layout: "padded" },
  args: { data: { budgetKnown: true, monthlyIncome: 3000, monthlyExpenses: 2150 } },
};

export default meta;
type Story = StoryObj<typeof BudgetWidget>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("£2,150")[0]).toBeDefined();
  },
};

export const NoBudget: Story = {
  args: { data: { budgetKnown: false, monthlyExpenses: 0 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Not set")[0]).toBeDefined();
  },
};
