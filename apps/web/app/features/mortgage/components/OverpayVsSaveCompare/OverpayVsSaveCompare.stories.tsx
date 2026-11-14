import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, within } from "storybook/test";
import { OverpayVsSaveCompare } from "./OverpayVsSaveCompare";

const meta: Meta<typeof OverpayVsSaveCompare> = {
  title: "3. Financial Patterns & Sections/OverpayVsSaveCompare",
  component: OverpayVsSaveCompare,
  parameters: {
    layout: "padded",
  },
  args: {
    loanAmount: 250000,
    interestRate: 5,
    remainingTerm: 25,
    overpayment: 300,
    mortgageType: "repayment",
  },
};

export default meta;
type Story = StoryObj<typeof OverpayVsSaveCompare>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The Storybook decorator renders a light and a dark copy, so take the first of each.
    await expect(canvasElement.textContent).toMatch(/overpaying the mortgage gives a total/);

    const [slider] = canvas.getAllByLabelText("Savings interest rate range slider");
    fireEvent.change(slider as HTMLElement, { target: { value: "6" } });
    await expect(canvas.getAllByLabelText("Savings interest rate range slider")[0]).toHaveValue(
      "6",
    );
    await expect(canvasElement.textContent).toMatch(/saving the money gives a total/);
  },
};

export const InterestOnly: Story = {
  args: { mortgageType: "interest-only", interestRate: 3, overpayment: 400 },
};

export const NotSet: Story = {
  args: { loanAmount: 0, interestRate: 0, remainingTerm: 0, overpayment: 300 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText(/Add your mortgage balance, interest rate and years left/)[0],
    ).toBeInTheDocument();
  },
};

export const NoOverpaymentBudget: Story = {
  args: { overpayment: 0 },
};

export const Dark: Story = { globals: { theme: "dark" } };
