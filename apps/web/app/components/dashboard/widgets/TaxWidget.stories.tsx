import type { Meta, StoryObj } from "@storybook/react";
import { TaxWidget } from "./TaxWidget";

const meta: Meta<typeof TaxWidget> = {
  title: "Dashboard/Widgets/TaxWidget",
  component: TaxWidget,
  tags: ["autodocs"],
  args: {
    editMode: false,
    size: "normal",
    onToggleSize: () => {},
    onHide: () => {},
    onMoveUp: () => {},
    onMoveDown: () => {},
    data: {
      taxYear: "2026/27",
      totalIncome: 12000,
      totalExpenses: 2000,
      netProfit: 10000,
      estimatedTaxDue: null,
      recordsCount: 5,
    },
  },
};

export default meta;
type Story = StoryObj<typeof TaxWidget>;

/** The Storybook preview renders every story side by side in light and dark. Tax due is not estimated yet, so the widget says so instead of showing a figure. */
export const NotCalculated: Story = {};

export const WithTaxDue: Story = {
  args: {
    data: {
      taxYear: "2026/27",
      totalIncome: 12000,
      totalExpenses: 2000,
      netProfit: 10000,
      estimatedTaxDue: 2900,
      recordsCount: 5,
    },
  },
};
