import type { Meta, StoryObj } from "@storybook/react";
import { MortgageWidget } from "./MortgageWidget";

const meta: Meta<typeof MortgageWidget> = {
  title: "Dashboard/Widgets/MortgageWidget",
  component: MortgageWidget,
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
type Story = StoryObj<typeof MortgageWidget>;

export const RateAndTermKnown: Story = {
  args: {
    data: {
      mortgageBalance: 200000,
      interestRate: 4.2,
      remainingTermYears: 22,
      hasMortgageAccount: true,
    },
  },
};

/** Unknown rate and term: prompts the user instead of showing a payment. */
export const EmptyPrompt: Story = {
  args: {
    data: {
      mortgageBalance: 200000,
      interestRate: null,
      remainingTermYears: null,
      hasMortgageAccount: true,
    },
  },
};
