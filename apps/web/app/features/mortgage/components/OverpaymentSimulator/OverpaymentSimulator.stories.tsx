import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, within } from "storybook/test";
import { OverpaymentSimulator } from "./OverpaymentSimulator";

const meta: Meta<typeof OverpaymentSimulator> = {
  title: "5. Calculators/Mortgage/OverpaymentSimulator",
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
    await expect(canvas.getAllByLabelText("Extra each month").length).toBeGreaterThan(0);
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
    await expect(canvasElement.textContent).toContain("Move the slider to see what changes");
    await expect(canvasElement.textContent).not.toMatch(/No change yet|Total each month/);
    // One line: the figure title names it, so there is no plot label and no legend.
    await expect(canvasElement.querySelector("[data-direct-label]")).toBeNull();
    await expect(canvasElement.textContent).not.toMatch(/\(solid\)|\(dashed\)/);
    await expect(canvasElement.textContent).not.toMatch(/\b0 months?\b/);
  },
};

export const NotSet: Story = {
  args: { loanAmount: 0, interestRate: 0, remainingTerm: 0, overpayment: 0 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).not.toContain("Not set");
  },
};

/** The seeded homeowner: 218 months left, so the last point is the year the term ends. */
export const SeededHomeowner: Story = {
  args: { loanAmount: 186000, interestRate: 4.5, remainingTerm: 218 / 12, overpayment: 100 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("Paid off sooner by");
    // One outcome: no sentence under it restates the new term.
    await expect(canvasElement.textContent).not.toMatch(/instead of 18 years 2 months/);
    await expect(canvasElement.textContent).not.toMatch(/Year \d/);
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
