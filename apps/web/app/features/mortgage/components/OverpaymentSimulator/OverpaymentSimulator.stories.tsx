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
    await expect(canvas.getAllByText("How your balance falls").length).toBeGreaterThan(0);
    await expect(
      canvas.getAllByLabelText("Monthly overpayment range slider").length,
    ).toBeGreaterThan(0);
    await expect(canvas.getAllByText(/early repayment charge/).length).toBeGreaterThan(0);
    // "Time shaved off" is a scenario outcome, so it is a plain card and never the hero surface.
    await expect(canvasElement.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    await expect(canvas.getAllByText("Time shaved off").length).toBeGreaterThan(0);
  },
};

export const InterestOnly: Story = {
  args: { mortgageType: "interest-only", overpayment: 500 },
  play: async ({ canvasElement }) => {
    // Interest-only saves no time, so the headline card becomes "Bullet balance reduced".
    await expect(canvasElement.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    await expect(
      within(canvasElement).getAllByText("Bullet balance reduced").length,
    ).toBeGreaterThan(0);
  },
};

export const ZeroOverpayment: Story = {
  args: { overpayment: 0 },
  play: async ({ canvasElement }) => {
    // With no overpayment the card says so plainly instead of showing a zero-month result.
    await expect(canvasElement.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    await expect(canvasElement.textContent).toContain("No change yet");
    await expect(canvasElement.textContent).not.toMatch(/\b0 months?\b/);
  },
};

export const NotSet: Story = {
  args: { loanAmount: 0, interestRate: 0, remainingTerm: 0, overpayment: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Mortgage details not set").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Not set").length).toBeGreaterThan(0);
  },
};
