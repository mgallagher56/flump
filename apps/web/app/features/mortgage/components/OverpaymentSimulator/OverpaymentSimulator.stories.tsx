import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, within } from "storybook/test";
import { OverpaymentSimulator } from "./OverpaymentSimulator";

const meta: Meta<typeof OverpaymentSimulator> = {
  title: "3. Financial Patterns & Sections/OverpaymentSimulator",
  component: OverpaymentSimulator,
  parameters: {
    layout: "padded",
  },
  args: {
    loanAmount: 200000,
    interestRate: 4,
    remainingTerm: 25,
    overpayment: 200,
    onOverpaymentChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof OverpaymentSimulator>;

// The Storybook decorator renders light and dark side by side, so queries use the "all" variants.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Paid off sooner by").length).toBeGreaterThan(0);
    await expect(canvas.getAllByLabelText("Extra each month range slider").length).toBeGreaterThan(
      0,
    );
    // A scenario outcome is never the hero surface.
    await expect(canvasElement.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
  },
};

export const InterestOnly: Story = {
  args: { mortgageType: "interest-only", overpayment: 500 },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText("Less to repay at the end of the term").length,
    ).toBeGreaterThan(0);
  },
};

export const ZeroOverpayment: Story = {
  args: { overpayment: 0 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("No change yet");
    await expect(canvasElement.textContent).not.toMatch(/\b0 months?\b/);
  },
};

export const NotSet: Story = {
  args: { loanAmount: 0, interestRate: 0, remainingTerm: 0, overpayment: 0 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).not.toContain("Not set");
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
