import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { DashboardKpiStrip } from "./DashboardKpiStrip";

const meta: Meta<typeof DashboardKpiStrip> = {
  title: "3. Patterns/Dashboard/DashboardKpiStrip",
  component: DashboardKpiStrip,
  parameters: { layout: "padded" },
  args: {
    budgetKnown: true,
    monthlySurplus: 1500,
    monthsOfCover: 4.7,
    totalOwed: null,
    pensionPot: 30000,
  },
};

export default meta;
type Story = StoryObj<typeof DashboardKpiStrip>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const WithPension: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Left over each month")[0]).toBeDefined();
    await expect(canvas.getAllByText("Pension pots")[0]).toBeDefined();
  },
};

export const WithDebt: Story = {
  args: { totalOwed: 8000 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("What you owe")[0]).toBeDefined();
  },
};

export const Shortfall: Story = { args: { monthlySurplus: -250 } };

export const NoBudget: Story = {
  args: { budgetKnown: false, monthlySurplus: null, monthsOfCover: null },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText(
        "Add your budget to see what is left over each month and your months of cover",
      )[0],
    ).toBeDefined();
  },
};
