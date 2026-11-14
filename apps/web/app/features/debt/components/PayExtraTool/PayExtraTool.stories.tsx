import { compareAvalancheAndSnowball, type DebtItem } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { PayExtraTool, type PayoffOrder } from "./PayExtraTool";

const debts: DebtItem[] = [
  { id: "cc", name: "Card", balance: 3000, apr: 22.9, minimumPayment: 90, type: "credit_card" },
  { id: "loan", name: "Loan", balance: 4500, apr: 7.9, minimumPayment: 150, type: "loan" },
];

const Stateful = ({ budgetLeftOver }: { budgetLeftOver: number | null }) => {
  const [extra, setExtra] = useState(0);
  const [order, setOrder] = useState<PayoffOrder>("avalanche");
  return (
    <PayExtraTool
      budgetLeftOver={budgetLeftOver}
      comparison={compareAvalancheAndSnowball(debts, extra)}
      extraPayment={extra}
      selectedStrategy={order}
      startBalance={7500}
      onChangeExtraPayment={setExtra}
      onSelectStrategy={setOrder}
    />
  );
};

const meta: Meta<typeof Stateful> = {
  title: "5. Calculators/Debt/PayExtraTool",
  component: Stateful,
  parameters: { layout: "padded" },
  args: { budgetLeftOver: 420 },
};

export default meta;
type Story = StoryObj<typeof Stateful>;

// The Storybook decorator renders light and dark side by side, so queries use the "all" variants.
export const UseLeftOver: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Use £420 left over" })[0] as HTMLElement,
    );
    await expect(canvas.getAllByText(/sooner/).length).toBeGreaterThan(0);
  },
};

export const NoBudget: Story = {
  args: { budgetLeftOver: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("Set up your budget to see what you have left over each month").length,
    ).toBeGreaterThan(0);
  },
};
