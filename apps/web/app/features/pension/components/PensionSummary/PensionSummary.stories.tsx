import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { PensionSummary } from "./PensionSummary";

const meta: Meta<typeof PensionSummary> = {
  title: "3. Financial Patterns & Sections/PensionSummary",
  component: PensionSummary,
  parameters: { layout: "padded" },
  args: {
    totalValue: 25000,
    potsCount: 2,
    hasSalary: true,
    monthlyEmployeeContrib: 188,
    monthlyEmployerContrib: 113,
    directMonthlyContrib: 50,
    employeePercent: 5,
    employerPercent: 3,
    netMonthlyCost: 135,
    taxReliefMonthly: 53,
    weightedReturnRate: 5.4,
  },
};

export default meta;
type Story = StoryObj<typeof PensionSummary>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const hero = canvasElement.querySelectorAll("[data-tone='hero']");
    await expect(hero.length).toBeGreaterThan(0);
    await expect(hero[0]?.textContent).toContain("Total in your pots");
  },
};

export const NoPotsOrSalary: Story = {
  args: {
    potsCount: 0,
    totalValue: 0,
    hasSalary: false,
    directMonthlyContrib: 0,
    monthlyEmployeeContrib: 0,
    monthlyEmployerContrib: 0,
    netMonthlyCost: 0,
    taxReliefMonthly: 0,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
    await expect(canvasElement.textContent).toContain("Add a pension pot to see its value");
  },
};
