import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { DebtSummary } from "./DebtSummary";

const meta: Meta<typeof DebtSummary> = {
  title: "3. Financial Patterns & Sections/DebtSummary",
  component: DebtSummary,
  parameters: { layout: "padded" },
  args: {
    totalDebt: 8400,
    highInterestDebt: 5200,
    monthlyMinimumTotal: 210,
    extraPayment: 50,
    debtFreeDate: "Aug 2028",
    totalInterestSaved: 640,
    monthsShaved: 7,
    strategy: "avalanche",
  },
};

export default meta;
type Story = StoryObj<typeof DebtSummary>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const hero = canvasElement.querySelectorAll("[data-tone='hero']");
    await expect(hero.length).toBeGreaterThan(0);
    await expect(hero[0]?.textContent).toContain("Debt-free by");
  },
};

export const AprNotSet: Story = {
  args: { aprUnknown: true },
  play: async ({ canvasElement }) => {
    // No hero and no invented date while an APR is missing.
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
    await expect(canvasElement.textContent).toContain("Not set");
  },
};

export const PaymentsNeverClear: Story = {
  args: { payoffAchievable: false },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
    await expect(canvasElement.textContent).toContain("Your payments do not clear the debt yet");
  },
};

export const EstimatedMinimums: Story = {
  args: { minimumEstimated: true },
  play: async ({ canvasElement }) => {
    const hero = canvasElement.querySelectorAll("[data-tone='hero']");
    await expect(hero[0]?.textContent).toContain("estimated");
  },
};
