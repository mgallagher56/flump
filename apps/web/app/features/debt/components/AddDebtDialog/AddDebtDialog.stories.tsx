import type { DebtItem } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { AddDebtDialog } from "./AddDebtDialog";

const debt: DebtItem = {
  id: "d1",
  name: "Barclaycard Platinum",
  type: "credit_card",
  balance: 3000,
  apr: 22.9,
  minimumPayment: 90,
};

const meta: Meta<typeof AddDebtDialog> = {
  title: "3. Financial Patterns & Sections/AddDebtDialog",
  component: AddDebtDialog,
  parameters: { layout: "fullscreen" },
  args: { isOpen: true, onClose: fn(), onAddDebt: fn(), onEditDebt: fn() },
};

export default meta;
type Story = StoryObj<typeof AddDebtDialog>;

// The dialog renders in a portal, so queries run against the document body.
export const AddMode: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await userEvent.type(await body.findByLabelText(/^Name of the debt/), "Klarna");
    await userEvent.type(body.getByLabelText(/^Balance you owe/), "250");
    await userEvent.click(body.getByRole("button", { name: "Add debt" }));
    await expect(args.onAddDebt).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Klarna", balance: 250, aprKnown: false }),
    );
  },
};

export const ValidationErrors: Story = {
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Add debt" }));
    await expect(body.getByText("Enter a name for this debt.")).toBeInTheDocument();
    await expect(body.getByText("Enter the balance you owe, more than £0.")).toBeInTheDocument();
  },
};

/** Edit mode: only name, APR and minimum payment are editable. */
export const EditMode: Story = {
  args: { debt },
  play: async () => {
    const body = within(document.body);
    await expect(await body.findByRole("dialog", { name: "Edit debt" })).toBeInTheDocument();
    await expect(body.queryByLabelText(/^Balance you owe/)).toBeNull();
    await expect(body.getByLabelText(/^Interest rate/)).toHaveValue("22.9");
  },
};
