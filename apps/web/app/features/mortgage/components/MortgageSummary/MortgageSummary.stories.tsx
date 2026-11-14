import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { MortgageSummary } from "./MortgageSummary";

const meta: Meta<typeof MortgageSummary> = {
  title: "3. Patterns/Mortgage/MortgageSummary",
  component: MortgageSummary,
  parameters: { layout: "padded" },
  args: {
    propertyCategory: "residential",
    mortgageType: "repayment",
    remainingTerm: 25,
    accountName: "HSBC Fixed Mortgage",
    lastUpdated: "Last updated 13 November 2026",
    saveMessage: null,
    onEdit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageSummary>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Residential: Story = {
  play: async ({ canvasElement, args }) => {
    const edit = within(canvasElement).getAllByRole("button", { name: "Edit" })[0];
    if (!edit) throw new Error("Edit button missing");
    await userEvent.click(edit);
    await expect(args.onEdit).toHaveBeenCalled();
  },
};

export const BuyToLet: Story = {
  args: { propertyCategory: "btl", mortgageType: "interest-only", accountName: null },
};

export const JustSaved: Story = { args: { saveMessage: "Saved repayment type and term" } };

export const Dark: Story = { globals: { theme: "dark" } };
