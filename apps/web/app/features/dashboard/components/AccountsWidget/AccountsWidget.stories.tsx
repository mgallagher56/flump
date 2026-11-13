import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AccountsWidget } from "./AccountsWidget";

const meta: Meta<typeof AccountsWidget> = {
  title: "3. Financial Patterns & Sections/AccountsWidget",
  component: AccountsWidget,
  parameters: { layout: "padded" },
  args: {
    data: {
      netWorth: 50000,
      totalAssets: 60000,
      totalLiabilities: 10000,
      accountsCount: 4,
      typeTotals: { Current: 12000, Saving: 36000, Pension: 12000, "Credit Card": 10000 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AccountsWidget>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("£50,000")[0]).toBeDefined();
    await expect(canvas.getAllByRole("img")[0]?.getAttribute("aria-label")).toContain("Saving 60%");
  },
};

export const NetNegative: Story = {
  args: {
    data: {
      netWorth: -4000,
      totalAssets: 1000,
      totalLiabilities: 5000,
      accountsCount: 2,
      typeTotals: { Current: 1000, Loan: 5000 },
    },
  },
};

export const NotSet: Story = {
  args: {
    data: { netWorth: 0, totalAssets: 0, totalLiabilities: 0, accountsCount: 0, typeTotals: {} },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set")[0]).toBeDefined();
    await expect(canvas.getAllByRole("link", { name: "Add an account" })[0]).toBeDefined();
  },
};
