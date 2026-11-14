import type { ProfileFacts } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { computePensionTakeHomeEffect, PensionTakeHomeEffect } from "./PensionTakeHomeEffect";

const FACTS: ProfileFacts = {
  annualSalary: 60_000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: ["PLAN_2"],
  pensionPercent: 5,
  isSalarySacrifice: true,
};

const meta: Meta<typeof PensionTakeHomeEffect> = {
  title: "3. Patterns/Pension/PensionTakeHomeEffect",
  component: PensionTakeHomeEffect,
  parameters: { layout: "padded" },
  args: { effect: computePensionTakeHomeEffect(FACTS, 1200) },
};

export default meta;
type Story = StoryObj<typeof PensionTakeHomeEffect>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const WithChange: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Change in take-home pay")[0]).toBeDefined();
  },
};

export const NetPay: Story = {
  args: {
    effect: computePensionTakeHomeEffect(
      { ...FACTS, annualSalary: 110_000, taxRegion: "SCOTLAND", isSalarySacrifice: false },
      2400,
    ),
  },
};

export const NoChange: Story = { args: { effect: computePensionTakeHomeEffect(FACTS, 0) } };
