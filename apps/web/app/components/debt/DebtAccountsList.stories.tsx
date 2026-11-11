import type { DebtItem } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { DebtAccountsList } from "./DebtAccountsList";

const debts: DebtItem[] = [
  {
    id: "d1",
    name: "Barclaycard Platinum",
    type: "credit_card",
    balance: 3000,
    apr: 22.9,
    minimumPayment: 90,
  },
  {
    id: "d2",
    name: "Tesco Loan",
    type: "loan",
    balance: 4500,
    apr: 0,
    aprKnown: false,
    minimumPayment: 120,
    minimumPaymentEstimated: true,
  },
];

const meta: Meta<typeof DebtAccountsList> = {
  title: "Debt/DebtAccountsList",
  component: DebtAccountsList,
  tags: ["autodocs"],
  args: {
    debts,
    onAddDebt: () => {},
    onDeleteDebt: () => {},
    onUpdateDebt: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof DebtAccountsList>;

/** Shows the "APR not set" and estimated-minimum markers. */
export const WithUnknownAprAndEstimatedMinimum: Story = {};
