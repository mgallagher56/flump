import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { MortgageTracker } from "./MortgageTracker";

const meta: Meta<typeof MortgageTracker> = {
  title: "3. Financial Patterns & Sections/MortgageTracker",
  component: MortgageTracker,
  parameters: {
    layout: "padded",
  },
  args: {
    loanAmount: 150000,
    interestRate: 4.5,
    remainingTerm: 25,
    onLoanAmountChange: fn(),
    onInterestRateChange: fn(),
    onRemainingTermChange: fn(),
    onMortgageTypeChange: fn(),
    mortgageAccounts: [
      { id: "m1", name: "Example fixed mortgage", type: "Mortgage", balance: -135400 },
    ],
    selectedAccountId: null,
    onSelectAccount: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageTracker>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Mortgage cost breakdown").length).toBeGreaterThan(0);
    await expect(canvas.getAllByLabelText("Interest rate range slider").length).toBeGreaterThan(0);
    const button = canvas.getAllByRole("button", { name: "Interest only" })[0];
    if (!button) throw new Error("Interest only button missing");
    await userEvent.click(button);
    await expect(args.onMortgageTypeChange).toHaveBeenCalledWith("interest-only");
  },
};

export const InterestOnly: Story = {
  args: { mortgageType: "interest-only" },
};

export const NotSet: Story = {
  args: { loanAmount: 0, interestRate: 0, remainingTerm: 0, mortgageAccounts: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Mortgage details not set").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Not set").length).toBeGreaterThan(0);
  },
};
