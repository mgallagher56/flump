import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { SavingsAccountsList } from "./SavingsAccountsList";

const accounts = [
  {
    id: "a1",
    name: "Easy access saver",
    type: "Saving",
    balance: 12400,
    interestRate: 4.5,
    monthlyContribution: 250,
  },
  {
    id: "a2",
    name: "Stocks and Shares ISA",
    type: "Investment",
    balance: 18650,
    interestRate: 6.5,
    monthlyContribution: 300,
  },
] as never[];

const meta: Meta<typeof SavingsAccountsList> = {
  title: "3. Patterns/Savings/SavingsAccountsList",
  component: SavingsAccountsList,
  args: { accounts },
};

export default meta;
type Story = StoryObj<typeof SavingsAccountsList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Edit Easy access saver" })[0] as HTMLElement,
    );
    const dialog = (await within(document.body).findAllByRole("dialog"))[0] as HTMLElement;
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));
    await expect(
      within(document.body).getAllByRole("alertdialog", { name: "Delete Easy access saver?" })[0],
    ).toBeDefined();
  },
};
