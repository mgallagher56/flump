import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { RateChangeTool } from "./RateChangeTool";

const meta: Meta<typeof RateChangeTool> = {
  title: "5. Calculators/Mortgage/RateChangeTool",
  component: RateChangeTool,
  parameters: {
    layout: "padded",
  },
  args: {
    loanGbp: 200000,
    annualRatePct: 4,
    termYears: 25,
    deltaPct: 2,
    mode: "new-loan",
    referenceDate: new Date("2026-11-21T00:00:00Z"),
  },
};

export default meta;
type Story = StoryObj<typeof RateChangeTool>;

export const NewLoan: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("rate-change-result")).toHaveTextContent("£1,056");
    await expect(canvas.getByTestId("rate-change-comparisons")).toHaveTextContent(
      "Payment at 6%, 2 points higher",
    );
    await expect(canvas.getByTestId("rate-change-comparisons")).toHaveTextContent(
      "Payment at 2%, 2 points lower",
    );
  },
};

export const SavedMortgageWithFixEnd: Story = {
  args: {
    loanGbp: 186000,
    annualRatePct: 4.5,
    termYears: 18,
    deltaPct: 1,
    fixEndDate: "2027-03-01",
    currentMonthlyPaymentGbp: 1250,
    mode: "saved-mortgage",
    referenceDate: new Date("2026-11-21T00:00:00Z"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("rate-change-result")).toHaveTextContent(
      /when your fixed rate ends in March 2027/,
    );
  },
};

export const MissingInputs: Story = {
  args: {
    loanGbp: null,
    annualRatePct: null,
    termYears: 25,
    mode: "new-loan",
  },
};
