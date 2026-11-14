import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MortgageTracker } from "./MortgageTracker";

const meta: Meta<typeof MortgageTracker> = {
  title: "3. Patterns/Mortgage/MortgageTracker",
  component: MortgageTracker,
  parameters: { layout: "padded" },
  args: { loanAmount: 150000, interestRate: 4.5, remainingTerm: 25 },
};

export default meta;
type Story = StoryObj<typeof MortgageTracker>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Total interest (estimate)").length).toBeGreaterThan(0);
  },
};

export const InterestOnly: Story = { args: { mortgageType: "interest-only" } };

export const NotSet: Story = {
  args: { loanAmount: 0, interestRate: 0, remainingTerm: 0 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent ?? "").not.toContain("Not set");
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
