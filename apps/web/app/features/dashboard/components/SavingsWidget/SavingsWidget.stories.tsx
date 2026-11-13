import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { SavingsWidget } from "./SavingsWidget";

const meta: Meta<typeof SavingsWidget> = {
  title: "3. Financial Patterns & Sections/SavingsWidget",
  component: SavingsWidget,
  parameters: { layout: "padded" },
  args: {
    data: {
      totalSavingsBalance: 12500,
      totalMonthlyContributions: 250,
      weightedInterestRate: 4.1,
      accountsCount: 2,
    },
  },
};

export default meta;
type Story = StoryObj<typeof SavingsWidget>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("£12,500")[0]).toBeDefined();
    await expect(canvas.getAllByText("1-year forecast")[0]).toBeDefined();
  },
};

export const ThreeYearHorizon: Story = {
  args: { config: { horizonYears: 3 } },
};

export const RateNotSet: Story = {
  args: {
    data: {
      totalSavingsBalance: 12500,
      totalMonthlyContributions: 0,
      weightedInterestRate: null,
      accountsCount: 1,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set")[0]).toBeDefined();
    await expect(canvas.getAllByRole("link", { name: "Add interest rate" })[0]).toBeDefined();
  },
};

export const NotSet: Story = {
  args: {
    data: {
      totalSavingsBalance: 0,
      totalMonthlyContributions: 0,
      weightedInterestRate: null,
      accountsCount: 0,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set")[0]).toBeDefined();
    await expect(canvas.getAllByRole("link", { name: "Add a savings account" })[0]).toBeDefined();
  },
};
