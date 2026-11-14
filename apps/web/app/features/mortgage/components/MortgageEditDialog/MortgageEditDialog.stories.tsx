import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { MortgageEditDialog } from "./MortgageEditDialog";

const meta: Meta<typeof MortgageEditDialog> = {
  title: "3. Patterns/Mortgage/MortgageEditDialog",
  component: MortgageEditDialog,
  parameters: { layout: "padded" },
  args: {
    open: true,
    onOpenChange: fn(),
    propertyCategory: "residential",
    canSaveFigures: true,
    canSaveTerm: true,
    mortgageAccounts: [{ id: "m1", name: "HSBC Fixed Mortgage", balance: -150000 }],
    selectedAccountId: "m1",
    onSelectAccount: fn(),
    editLoanAmount: 150000,
    editInterestRate: "4.5",
    editRemainingTerm: "25",
    editMortgageType: "repayment",
    editFixEndDate: "",
    editPayment: 833.76,
    saveError: null,
    onAddAccount: fn(),
    onSave: fn(),
    onEditLoanAmountChange: fn(),
    onEditInterestRateChange: fn(),
    onEditRemainingTermChange: fn(),
    onEditMortgageTypeChange: fn(),
    onEditFixEndDateChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageEditDialog>;

// The dialog renders in a portal, so queries run against the document body.
export const Residential: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    const save = body.getAllByRole("button", { name: "Save" })[0];
    if (!save) throw new Error("Save button missing");
    await userEvent.click(save);
    await expect(args.onSave).toHaveBeenCalled();
  },
};

export const BuyToLet: Story = {
  args: { propertyCategory: "btl", canSaveTerm: false, mortgageAccounts: [] },
};

export const NoAccount: Story = {
  args: { canSaveFigures: false, canSaveTerm: false, mortgageAccounts: [] },
};

export const Dark: Story = { globals: { theme: "dark" } };
