import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn } from "storybook/test";
import { DebtSummary } from "./DebtSummary";

const meta: Meta<typeof DebtSummary> = {
  title: "3. Financial Patterns & Sections/DebtSummary",
  component: DebtSummary,
  parameters: { layout: "padded" },
  args: {
    totalDebt: 8400,
    debtCount: 2,
    monthlyMinimumTotal: 210,
    debtFreeDate: "August 2028",
    interestThisYear: 640,
    onAddRate: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DebtSummary>;

// The Storybook decorator renders light and dark side by side.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const hero = canvasElement.querySelectorAll("[data-tone='hero']");
    await expect(hero.length).toBeGreaterThan(0);
    await expect(hero[0]?.textContent).toContain("Total you owe");
  },
};

export const AprNotSet: Story = {
  args: { missingAprCount: 2 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).not.toContain("Not set");
    await expect(canvasElement.textContent).toContain(
      "Add the rate for 2 debts to see your debt-free date",
    );
  },
};

export const PaymentsNeverPayOff: Story = {
  args: { payoffAchievable: false },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("Not paid off");
  },
};

export const EstimatedMinimums: Story = {
  args: { minimumEstimated: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("Some minimum payments are estimates");
  },
};
