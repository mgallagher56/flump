import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { AddPensionAccountDialog } from "./AddPensionAccountDialog";

const meta: Meta<typeof AddPensionAccountDialog> = {
  title: "3. Patterns/Pension/AddPensionAccountDialog",
  component: AddPensionAccountDialog,
  args: { isOpen: true, onClose: fn() },
};

export default meta;
type Story = StoryObj<typeof AddPensionAccountDialog>;

export const Add: Story = {
  play: async () => {
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(dialog.getByRole("button", { name: "Add pot" })).toHaveProperty("disabled", true);
    await userEvent.type(dialog.getByLabelText(/Pot or provider name/), "Nest");
    await expect(dialog.getByRole("button", { name: "Add pot" })).toHaveProperty("disabled", false);
  },
};

export const EditPastPot: Story = {
  args: {
    accountToEdit: {
      id: "p2",
      name: "Old Employer Pension",
      type: "Pension",
      balance: 12000,
      interestRate: 4.5,
      isCurrent: false,
    } as never,
  },
  play: async () => {
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(dialog.getByLabelText(/Regular payment each month/)).toHaveProperty(
      "disabled",
      true,
    );
  },
};
