import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { MortgageSummary } from "./MortgageSummary";

const meta: Meta<typeof MortgageSummary> = {
  title: "3. Financial Patterns & Sections/MortgageSummary",
  component: MortgageSummary,
  parameters: { layout: "padded" },
  args: {
    propertyCategory: "residential",
    loanAmount: 150000,
    interestRate: 4.5,
    remainingTerm: 25,
    mortgageType: "repayment",
    monthlyPayment: 833.76,
    isEditing: false,
    editLoanAmount: 150000,
    editInterestRate: "4.5",
    editRemainingTerm: "25",
    editMortgageType: "repayment",
    editPayment: 833.76,
    saveMessage: null,
    saveError: null,
    canSaveFigures: true,
    canSaveTerm: true,
    lastUpdated: "Last updated 13 November 2026",
    onAddAccount: fn(),
    onStartEditing: fn(),
    onCancelEditing: fn(),
    onSave: fn(),
    onEditLoanAmountChange: fn(),
    onEditInterestRateChange: fn(),
    onEditRemainingTermChange: fn(),
    onEditMortgageTypeChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageSummary>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement, args }) => {
    const edit = within(canvasElement).getAllByRole("button", { name: "Edit" })[0];
    if (!edit) throw new Error("Edit button missing");
    await userEvent.click(edit);
    await expect(args.onStartEditing).toHaveBeenCalled();
  },
};

export const NotSet: Story = {
  args: { loanAmount: 0, interestRate: 0, remainingTerm: 0, monthlyPayment: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Not set").length).toBeGreaterThan(0);
  },
};

export const Editing: Story = {
  args: { isEditing: true },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getAllByRole("button", { name: "Interest-only" })[0];
    if (!button) throw new Error("Interest-only button missing");
    await userEvent.click(button);
    await expect(args.onEditMortgageTypeChange).toHaveBeenCalledWith("interest-only");
  },
};

export const EditingWithFixEndDate: Story = {
  args: { isEditing: true, editFixEndDate: "2027-06-30", onEditFixEndDateChange: fn() },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getAllByLabelText(/Fixed rate end date/)[0];
    await expect(input).toHaveValue("2027-06-30");
  },
};

export const EditingWithoutAccount: Story = {
  args: { isEditing: true, canSaveFigures: false, canSaveTerm: false },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getAllByRole("button", {
      name: "Add mortgage account",
    })[0];
    if (!button) throw new Error("Add mortgage account button missing");
    await userEvent.click(button);
    await expect(args.onAddAccount).toHaveBeenCalled();
  },
};
