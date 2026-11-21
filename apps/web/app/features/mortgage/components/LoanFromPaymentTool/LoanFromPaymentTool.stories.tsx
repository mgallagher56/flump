import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { LoanFromPaymentTool, type LoanFromPaymentToolProps } from "./LoanFromPaymentTool";

const Stateful = (initial: Partial<LoanFromPaymentToolProps>) => {
  const [monthlyPaymentGbp, setMonthlyPaymentGbp] = useState<number | null>(
    initial.monthlyPaymentGbp ?? 1000,
  );
  const [annualRatePct, setAnnualRatePct] = useState<number | null>(initial.annualRatePct ?? null);
  const [termYears, setTermYears] = useState<number>(initial.termYears ?? 25);
  const [depositGbp, setDepositGbp] = useState<number | null>(initial.depositGbp ?? null);
  const [buyingCostsGbp, setBuyingCostsGbp] = useState<number | null>(
    initial.buyingCostsGbp ?? null,
  );

  return (
    <LoanFromPaymentTool
      annualRatePct={annualRatePct}
      buyingCostsGbp={buyingCostsGbp}
      depositGbp={depositGbp}
      monthlyPaymentGbp={monthlyPaymentGbp}
      referenceDate={initial.referenceDate ?? new Date("2026-11-21T00:00:00Z")}
      termYears={termYears}
      onAnnualRateChange={setAnnualRatePct}
      onBuyingCostsChange={setBuyingCostsGbp}
      onDepositChange={setDepositGbp}
      onMonthlyPaymentChange={setMonthlyPaymentGbp}
      onTermYearsChange={setTermYears}
    />
  );
};

const meta: Meta<typeof LoanFromPaymentTool> = {
  title: "5. Calculators/Mortgage/LoanFromPaymentTool",
  component: LoanFromPaymentTool,
  parameters: {
    layout: "padded",
  },
  args: {
    monthlyPaymentGbp: 1000,
    annualRatePct: 4.5,
    termYears: 25,
    depositGbp: null,
    buyingCostsGbp: null,
    onMonthlyPaymentChange: fn(),
    onAnnualRateChange: fn(),
    onTermYearsChange: fn(),
    onDepositChange: fn(),
    onBuyingCostsChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof LoanFromPaymentTool>;

export const SingleRate: Story = {
  render: () => <Stateful annualRatePct={4.5} depositGbp={30000} monthlyPaymentGbp={1000} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("loan-from-payment-result")).toHaveTextContent("~£180,000");
    await expect(canvas.getByTestId("loan-from-payment-result")).toHaveTextContent(
      "With a £30,000 deposit",
    );
  },
};

export const LtvBandFromDeposit: Story = {
  render: () => <Stateful annualRatePct={null} depositGbp={50000} monthlyPaymentGbp={1000} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Assumption: rates seen in November 2026 for this loan to value/),
    ).toBeInTheDocument();
  },
};

export const StaleLtvRates: Story = {
  render: () => (
    <Stateful
      annualRatePct={null}
      depositGbp={50000}
      monthlyPaymentGbp={1000}
      referenceDate={new Date("2027-07-01T00:00:00Z")}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("stale-rate-notice")).toHaveTextContent(
      "These rates are from November 2026, more than six months ago. You can type a current rate.",
    );
  },
};

export const EmptyRate: Story = {
  render: () => <Stateful annualRatePct={null} depositGbp={null} monthlyPaymentGbp={1000} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Enter an interest rate or add a deposit to see an estimated loan/),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: /Deposit and buying costs/ }));
    await expect(canvas.getByLabelText("Deposit")).toBeInTheDocument();
  },
};
