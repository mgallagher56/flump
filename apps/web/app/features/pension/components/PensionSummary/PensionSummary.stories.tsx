import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, within } from "storybook/test";
import { PensionSummary } from "./PensionSummary";

const meta: Meta<typeof PensionSummary> = {
  title: "3. Financial Patterns & Sections/PensionSummary",
  component: PensionSummary,
  parameters: { layout: "padded" },
  args: {
    totalValue: 96000,
    potsCount: 1,
    estimatedMonthlyIncome: 1240,
    monthlyTotal: 532,
    retirementAge: 67,
    onAddPot: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PensionSummary>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBeGreaterThan(0);
    await expect(within(canvasElement).getAllByText("Estimate")[0]).toBeDefined();
  },
};

export const NoPots: Story = {
  args: { potsCount: 0, totalValue: 0, estimatedMonthlyIncome: null },
  play: async ({ canvasElement, args }) => {
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
    within(canvasElement).getAllByRole("button", { name: "Add pension pot" })[0]?.click();
    await expect(args.onAddPot).toHaveBeenCalled();
  },
};

export const MostlyUnknown: Story = {
  args: { estimatedMonthlyIncome: null, retirementAge: null },
};
