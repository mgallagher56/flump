import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";
import { IncomeMultipleTool, type IncomeMultipleToolProps } from "./IncomeMultipleTool";

const Stateful = (initial: Partial<IncomeMultipleToolProps>) => {
  const [primary, setPrimary] = useState<number | null>(initial.primaryAnnualIncomeGbp ?? 38000);
  const [second, setSecond] = useState<number | null>(initial.secondAnnualIncomeGbp ?? null);
  const [low, setLow] = useState<number>(initial.lowMultiple ?? 4);
  const [high, setHigh] = useState<number>(initial.highMultiple ?? 4.5);
  const [deposit, setDeposit] = useState<number | null>(initial.depositGbp ?? null);
  const [costs, setCosts] = useState<number | null>(initial.buyingCostsGbp ?? null);

  return (
    <IncomeMultipleTool
      buyingCostsGbp={costs}
      depositGbp={deposit}
      highMultiple={high}
      lowMultiple={low}
      primaryAnnualIncomeGbp={primary}
      secondAnnualIncomeGbp={second}
      onBuyingCostsChange={setCosts}
      onDepositChange={setDeposit}
      onHighMultipleChange={setHigh}
      onLowMultipleChange={setLow}
      onPrimaryIncomeChange={setPrimary}
      onSecondIncomeChange={setSecond}
    />
  );
};

const meta: Meta<typeof IncomeMultipleTool> = {
  title: "5. Calculators/Mortgage/IncomeMultipleTool",
  component: IncomeMultipleTool,
  parameters: {
    layout: "padded",
  },
  args: {
    primaryAnnualIncomeGbp: 38000,
    secondAnnualIncomeGbp: 27000,
    lowMultiple: 4,
    highMultiple: 4.5,
    depositGbp: null,
    buyingCostsGbp: null,
    onPrimaryIncomeChange: fn(),
    onSecondIncomeChange: fn(),
    onLowMultipleChange: fn(),
    onHighMultipleChange: fn(),
    onDepositChange: fn(),
    onBuyingCostsChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof IncomeMultipleTool>;

export const JointWithDeposit: Story = {
  render: () => (
    <Stateful depositGbp={30000} primaryAnnualIncomeGbp={38000} secondAnnualIncomeGbp={27000} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("income-multiple-result")).toHaveTextContent(
      "~£260,000 to ~£293,000",
    );
    await expect(canvas.getByTestId("income-multiple-result")).toHaveTextContent(
      "With a £30,000 deposit",
    );
  },
};

export const NoIncome: Story = {
  render: () => <Stateful primaryAnnualIncomeGbp={null} secondAnnualIncomeGbp={null} />,
};
