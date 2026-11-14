import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { PensionTakeHomeEffect } from "./PensionTakeHomeEffect";

const meta: Meta<typeof PensionTakeHomeEffect> = {
  title: "3. Financial Patterns & Sections/PensionTakeHomeEffect",
  component: PensionTakeHomeEffect,
  parameters: { layout: "padded" },
  args: {
    extraMonthly: 200,
    facts: {
      annualSalary: 60_000,
      employmentType: "employed",
      taxRegion: "ENGLAND",
      studentLoanPlans: ["PLAN_2"],
      pensionPercent: 5,
      isSalarySacrifice: true,
    },
  },
};

export default meta;
type Story = StoryObj<typeof PensionTakeHomeEffect>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const WithExtra: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Effect on take-home")[0]).toBeDefined();
  },
};

export const NetPay: Story = {
  args: {
    facts: {
      annualSalary: 110_000,
      employmentType: "employed",
      taxRegion: "SCOTLAND",
      studentLoanPlans: [],
      pensionPercent: 4,
      isSalarySacrifice: false,
    },
  },
};

export const NoExtra: Story = { args: { extraMonthly: 0 } };
