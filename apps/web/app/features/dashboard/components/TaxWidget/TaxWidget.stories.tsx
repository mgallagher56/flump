import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { TaxWidget } from "./TaxWidget";

const meta: Meta<typeof TaxWidget> = {
  title: "3. Financial Patterns & Sections/TaxWidget",
  component: TaxWidget,
  parameters: { layout: "padded" },
  args: {
    data: {
      taxYear: "2026/27",
      totalIncome: 12000,
      totalExpenses: 2000,
      netProfit: 10000,
      estimatedTaxDue: 2900,
      recordsCount: 5,
    },
  },
};

export default meta;
type Story = StoryObj<typeof TaxWidget>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const EstimateKnown: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("£2,900")[0]).toBeDefined();
  },
};

/** No verified estimate yet: "Not set" with the reason, never £0 or an invented figure. */
export const NotSet: Story = {
  args: {
    data: {
      taxYear: "2026/27",
      totalIncome: 12000,
      totalExpenses: 2000,
      netProfit: 10000,
      estimatedTaxDue: null,
      recordsCount: 5,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set")[0]).toBeDefined();
    await expect(
      canvas.getAllByText("Calculated once tax estimates are verified")[0],
    ).toBeDefined();
  },
};
