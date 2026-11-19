import type { DebtItem } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { AddDebtDialog } from "./AddDebtDialog";

const debt: DebtItem = {
  id: "d1",
  name: "Everyday credit card",
  type: "credit_card",
  balance: 3000,
  apr: 22.9,
  minimumPayment: 90,
};

const meta: Meta<typeof AddDebtDialog> = {
  title: "3. Patterns/Debt/AddDebtDialog",
  component: AddDebtDialog,
  parameters: { layout: "fullscreen" },
  args: { isOpen: true, onClose: fn(), onAddDebt: fn(), onEditDebt: fn(), onDeleteDebt: fn() },
};

export default meta;
type Story = StoryObj<typeof AddDebtDialog>;

// The dialog renders in a portal, so queries run against the document body.
export const AddMode: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await userEvent.type(await body.findByLabelText(/^Name of the debt/), "Sofa payments");
    await userEvent.type(body.getByLabelText(/^Balance you owe/), "250");
    await userEvent.click(body.getByRole("button", { name: "Add debt" }));
    await expect(args.onAddDebt).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Sofa payments", balance: 250, aprKnown: false }),
    );
  },
};

export const ValidationErrors: Story = {
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Add debt" }));
    await expect(body.getByText("Enter a name for this debt.")).toBeInTheDocument();
    // A credit card (the default type) can be at £0, so its balance only has to be £0 or more.
    await expect(body.getByText("Enter the balance you owe, £0 or more.")).toBeInTheDocument();
  },
};

/** Edit mode: every field but the type, the balance included (SD-8). */
export const EditMode: Story = {
  args: { debt },
  play: async () => {
    const body = within(document.body);
    await expect(await body.findByRole("dialog", { name: "Edit debt" })).toBeInTheDocument();
    await expect(body.getByLabelText(/^Balance you owe/)).toHaveValue("3,000");
    await expect(body.getByLabelText(/^Interest rate/)).toHaveValue("22.9");
  },
};

/** A joint debt edits its whole balance and says so beside the field (decision 9 A). */
export const EditJoint: Story = {
  args: {
    debt: { ...debt, balance: 1200, wholeBalance: 3000, ownership: "joint", sharePercent: 40 },
  },
  play: async ({ args }) => {
    const body = within(document.body);
    await expect(await body.findByLabelText(/^Balance you owe/)).toHaveValue("3,000");
    await expect(
      body.getByText("This is the whole balance. Your share is 40% of it."),
    ).toBeInTheDocument();
    await userEvent.clear(body.getByLabelText("Your share"));
    await userEvent.type(body.getByLabelText("Your share"), "50");
    await userEvent.click(body.getByRole("button", { name: "Save changes" }));
    await expect(args.onEditDebt).toHaveBeenCalledWith("d1", {
      ownership: "joint",
      sharePercent: 50,
    });
  },
};

/** Delete sits in the edit dialog, apart from Save; the page confirms before deleting. */
export const EditModeDelete: Story = {
  args: { debt },
  play: async ({ args }) => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Delete debt" }));
    await expect(args.onClose).toHaveBeenCalled();
    await expect(args.onDeleteDebt).toHaveBeenCalledWith("d1");
  },
};
