import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AccountsSummary } from "./AccountsSummary";

const meta: Meta<typeof AccountsSummary> = {
  title: "Accounts/AccountsSummary",
  component: AccountsSummary,
  args: {
    accountCount: 6,
    stats: {
      assets: 255000,
      liabilities: 100000,
      netWorth: 155000,
      studentLoans: 0,
      liquidCash: 17400,
      weightedAvgApy: 4.2,
    },
    allocation: [
      { type: "Property", value: 200000, percentage: 78.4 },
      { type: "Saving", value: 37600, percentage: 14.7 },
      { type: "Current", value: 17400, percentage: 6.9 },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof AccountsSummary>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Net worth")).toBeDefined();
    await expect(canvas.getByRole("heading", { name: "Where you stand" })).toBeDefined();
  },
};

export const WithStudentLoan: Story = {
  args: {
    stats: {
      assets: 40000,
      liabilities: 5000,
      netWorth: 35000,
      studentLoans: 42000,
      liquidCash: 9000,
      weightedAvgApy: 3.9,
    },
  },
};

/** A homeowner whose home is their own estimate (E16 D3): named, and counted in net worth. */
export const WithHomeEstimate: Story = {
  args: {
    stats: {
      assets: 427000,
      liabilities: 186000,
      netWorth: 241000,
      homeEstimate: 310000,
      studentLoans: 0,
      liquidCash: 21000,
      weightedAvgApy: 0,
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText(/Home \(your estimate\)/)[0]).toBeDefined();
  },
};
