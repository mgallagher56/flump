import type { Meta, StoryObj } from "@storybook/react";
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

export const Default: Story = {};

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
