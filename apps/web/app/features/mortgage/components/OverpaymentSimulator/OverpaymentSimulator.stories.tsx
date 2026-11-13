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
    await expect(canvas.getAllByText("Amortisation projection").length).toBeGreaterThan(0);
    await expect(
      canvas.getAllByLabelText("Monthly overpayment range slider").length,
    ).toBeGreaterThan(0);
    await expect(canvas.getAllByText(/early repayment charge/).length).toBeGreaterThan(0);
    // "Time shaved off" is the page's single hero card (one per theme in the side-by-side decorator).
    const hero = canvasElement.querySelectorAll("[data-tone='hero']");
    await expect(hero.length).toBeGreaterThan(0);
    await expect(hero[0]?.textContent).toContain("Time shaved off");
  },
};

export const InterestOnly: Story = {
  args: { mortgageType: "interest-only", overpayment: 500 },
  play: async ({ canvasElement }) => {
    // Interest-only saves no time, so the hero moves to "Bullet balance reduced".
    const hero = canvasElement.querySelectorAll("[data-tone='hero']");
    await expect(hero.length).toBeGreaterThan(0);
    await expect(hero[0]?.textContent).toContain("Bullet balance reduced");
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
