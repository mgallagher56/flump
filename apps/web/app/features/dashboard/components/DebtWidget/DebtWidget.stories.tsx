import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import type { DebtSummary } from "~/utils/debtSummary";
import { DebtWidget } from "./DebtWidget";

const summary: DebtSummary = {
  totalDebt: 8200,
  debtCount: 3,
  highInterestCount: 2,
  monthlyMinimumTotal: 265,
  monthlyMinimumEstimated: false,
  debtFreeDate: "December 2027",
  debts: [],
};

const meta: Meta<typeof DebtWidget> = {
  title: "3. Financial Patterns & Sections/DebtWidget",
  component: DebtWidget,
  parameters: { layout: "padded" },
  args: { data: summary },
};

export default meta;
type Story = StoryObj<typeof DebtWidget>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("December 2027")[0]).toBeDefined();
  },
};

export const NotPaidOffAtMinimums: Story = {
  args: { data: { ...summary, debtFreeDate: null } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Not set")[0]).toBeDefined();
  },
};

export const NoDebt: Story = { args: { data: null } };
