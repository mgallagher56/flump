import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { SavingsAccountsList } from "./SavingsAccountsList";

const accounts = [
  {
    id: "a1",
    name: "Marcus easy access",
    type: "Saving",
    balance: 12400,
    interestRate: 4.5,
    monthlyContribution: 250,
  },
  {
    id: "a2",
    name: "Vanguard ISA",
    type: "Investment",
    balance: 18650,
    interestRate: 6.5,
    monthlyContribution: 300,
  },
] as never[];

const meta: Meta<typeof SavingsAccountsList> = {
  title: "3. Financial Patterns & Sections/SavingsAccountsList",
  component: SavingsAccountsList,
  args: { accounts, onOpenAddModal: fn(), variant: "desktop" },
};

export default meta;
type Story = StoryObj<typeof SavingsAccountsList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Edit balance for Vanguard ISA/ })[0],
    );
    await expect(canvas.getAllByRole("spinbutton")[0]).toBeDefined();
  },
};

export const Empty: Story = { args: { accounts: [] } };
