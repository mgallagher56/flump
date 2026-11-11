import type { DebtItem } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
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
  title: "Debt/AddDebtDialog",
  component: AddDebtDialog,
  tags: ["autodocs"],
  args: { isOpen: true, onClose: () => {}, onAddDebt: () => {} },
};

export default meta;
type Story = StoryObj<typeof AddDebtDialog>;

export const AddMode: Story = {};

/** Edit mode: only name, APR and minimum payment are editable. */
export const EditMode: Story = { args: { debt, onEditDebt: () => {} } };
