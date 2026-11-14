import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AccountsGroupList } from "./AccountsGroupList";

const meta: Meta<typeof AccountsGroupList> = {
  title: "3. Patterns/Accounts/AccountsGroupList",
  component: AccountsGroupList,
  parameters: { router: { loaderData: { accounts: [], bankConnectionsEnabled: false } } },
  args: {
    rows: [
      {
        id: "a1",
        name: "Monzo current",
        type: "Current",
        balance: 2450,
        changePercent: 4,
        favourable: true,
      },
      {
        id: "a2",
        name: "Marcus easy access",
        type: "Saving",
        balance: 12400,
        changePercent: 1,
        favourable: true,
      },
      {
        id: "a3",
        name: "Barclaycard",
        type: "Credit Card",
        balance: 640,
        changePercent: -12,
        favourable: true,
      },
      {
        id: "a4",
        name: "Nationwide mortgage",
        type: "Mortgage",
        balance: 182000,
        changePercent: 0,
        favourable: true,
      },
    ],
    totalOwn: 14850,
    totalOwe: 182640,
    netWorth: -167790,
    leftOut: [],
  },
};

export default meta;
type Story = StoryObj<typeof AccountsGroupList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "Monzo current" })).toBeDefined();
    await expect(canvas.getByRole("heading", { name: "What you own" })).toBeDefined();
    await expect(canvas.getByRole("heading", { name: "What you owe" })).toBeDefined();
    await expect(canvas.getByText("Net worth")).toBeDefined();
  },
};
