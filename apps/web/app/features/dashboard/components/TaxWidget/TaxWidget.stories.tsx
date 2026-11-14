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
      canvas.getAllByText("Shown once you add income not taxed through PAYE")[0],
    ).toBeDefined();
  },
};

export const WithNextThousand: Story = {
  args: {
    data: {
      taxYear: "2026/27",
      totalIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      estimatedTaxDue: null,
      recordsCount: 0,
      marginal: {
        nextThousandDeductedPct: 42,
        takeHomeFromNextThousand: 580,
        ratesYear: "2026/27",
        isUnverifiedEstimate: true,
        nextThreshold: {
          kind: "higherRate",
          band: { name: "Higher", rate: 0.4 },
          grossAt: 50270,
          distance: 2270,
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Your next £1,000 of pay")[0]).toBeDefined();
  },
};
