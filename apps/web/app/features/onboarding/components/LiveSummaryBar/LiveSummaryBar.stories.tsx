import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { deriveOnboardingSummary } from "../../deriveOnboardingSummary";
import { INITIAL_VALUES } from "../../types";
import { LiveSummaryBar } from "./LiveSummaryBar";

const meta: Meta<typeof LiveSummaryBar> = {
  title: "Onboarding/LiveSummaryBar",
  component: LiveSummaryBar,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof LiveSummaryBar>;

export const NothingEntered: Story = {
  args: { assumingRegion: false, summary: deriveOnboardingSummary(INITIAL_VALUES) },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("Not set");
    await expect(canvasElement.textContent).not.toContain("£0");
  },
};

export const WithFigures: Story = {
  args: {
    assumingRegion: true,
    summary: deriveOnboardingSummary({
      ...INITIAL_VALUES,
      grossSalary: 45000,
      monthlyHousingCost: 900,
      cashSavings: 5000,
    }),
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("Monthly take-home pay (estimate)");
  },
};

/** Pension and student loan answered: the bar says what the take-home now includes. */
export const WithDeductionsNote: Story = {
  args: {
    assumingRegion: false,
    summary: deriveOnboardingSummary({
      ...INITIAL_VALUES,
      grossSalary: 45000,
      taxRegion: "ENGLAND",
      studentLoanPlan: "PLAN_2",
      pensionPercent: 5,
    }),
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain(
      "Now includes your 5% pension and student loan",
    );
  },
};
