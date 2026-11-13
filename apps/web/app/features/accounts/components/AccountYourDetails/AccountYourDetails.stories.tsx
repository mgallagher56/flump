import type { Meta, StoryObj } from "@storybook/react";
import { AccountYourDetails } from "./AccountYourDetails";

const meta: Meta<typeof AccountYourDetails> = {
  title: "Accounts/AccountYourDetails",
  component: AccountYourDetails,
  parameters: {
    router: {
      loaderData: {
        accounts: [{ id: "a1", name: "Monzo current", type: "Current", balance: 2450 }],
      },
    },
  },
  args: {
    accountId: "a1",
    name: "Monzo current",
    type: "Current",
    balance: 2450,
    lastUpdated: "March 2026",
  },
};

export default meta;
type Story = StoryObj<typeof AccountYourDetails>;

export const Default: Story = {};

export const Liability: Story = {
  args: { name: "Barclaycard", type: "Credit Card", balance: 640 },
};
