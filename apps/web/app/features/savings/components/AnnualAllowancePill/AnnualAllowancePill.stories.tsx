import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AnnualAllowancePill } from "./AnnualAllowancePill";

const meta: Meta<typeof AnnualAllowancePill> = {
  title: "3. Patterns/Savings/AnnualAllowancePill",
  component: AnnualAllowancePill,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof AnnualAllowancePill>;

export const Isa: Story = {
  args: { type: "isa", currentAmount: 8500, savingsInterest: 300 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("ISA allowance")[0]).toBeDefined();
  },
};

export const Pension: Story = {
  args: { type: "pension", currentAmount: 25000 },
};

/** Income saved, so the Personal Savings Allowance names the band. */
export const IsaBasicRate: Story = {
  args: { type: "isa", currentAmount: 8500, savingsInterest: 300, taxBand: "basic" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/basic rate/)).toBeDefined();
  },
};

/** No income saved: no band is claimed. */
export const IsaIncomeUnknown: Story = {
  args: { type: "isa", currentAmount: 8500, savingsInterest: 300 },
};

export const IsaIncomeUnknownDark: Story = { ...IsaIncomeUnknown, globals: { theme: "dark" } };
