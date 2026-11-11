import type { Meta, StoryObj } from "@storybook/react";
import { DebtWidget } from "./DebtWidget";

const meta: Meta<typeof DebtWidget> = {
  title: "Dashboard/Widgets/DebtWidget",
  component: DebtWidget,
  tags: ["autodocs"],
  args: {
    editMode: false,
    size: "normal",
    onToggleSize: () => {},
    onHide: () => {},
    onMoveUp: () => {},
    onMoveDown: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof DebtWidget>;

/** No consumer debts: an honest empty state rather than invented figures. */
export const Empty: Story = { args: { data: null } };

export const WithDebts: Story = {
  args: {
    data: {
      totalDebt: 7500,
      debtCount: 2,
      highInterestCount: 1,
      monthlyMinimumTotal: 210,
      monthlyMinimumEstimated: true,
      debtFreeDate: null,
      debts: [],
    },
  },
};
