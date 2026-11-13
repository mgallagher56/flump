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
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("£8,200")[0]).toBeDefined();
    await expect(canvas.getAllByText("December 2027")[0]).toBeDefined();
  },
};

export const NotCalculated: Story = {
  args: { data: { ...summary, debtFreeDate: null } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Not calculated")[0]).toBeDefined();
  },
};

export const AprNotSet: Story = {
  args: {
    data: {
      ...summary,
      debtFreeDate: null,
      debts: [{ id: "card", name: "Credit card", aprKnown: false }],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set")[0]).toBeDefined();
    await expect(canvas.getAllByRole("link", { name: "Add APR" })[0]).toBeDefined();
  },
};

export const NoDebts: Story = {
  args: { data: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("No debts added")[0]).toBeDefined();
    await expect(canvas.getAllByRole("link", { name: "Add a debt" })[0]).toBeDefined();
  },
};
