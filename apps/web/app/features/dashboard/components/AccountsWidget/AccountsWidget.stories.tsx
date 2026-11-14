import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AccountsWidget } from "./AccountsWidget";

const meta: Meta<typeof AccountsWidget> = {
  title: "3. Patterns/Dashboard/AccountsWidget",
  component: AccountsWidget,
  parameters: { layout: "padded" },
  args: { data: { accountsCount: 4 } },
};

export default meta;
type Story = StoryObj<typeof AccountsWidget>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("4 accounts")[0]).toBeDefined();
  },
};

export const Empty: Story = {
  args: { data: { accountsCount: 0 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Not set")[0]).toBeDefined();
  },
};
