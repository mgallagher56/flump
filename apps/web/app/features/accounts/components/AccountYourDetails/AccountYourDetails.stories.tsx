import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Your account" })).toBeDefined();
    await expect(canvas.getByText("Saved")).toBeDefined();
    await expect(canvas.getByRole("button", { name: /edit/i })).toBeDefined();
  },
};

export const Liability: Story = {
  args: { name: "Barclaycard", type: "Credit Card", balance: 640 },
};
