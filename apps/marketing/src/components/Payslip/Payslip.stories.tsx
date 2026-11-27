import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { Payslip } from "./Payslip";

const meta: Meta<typeof Payslip> = {
  title: "3. Patterns/Marketing/Payslip",
  component: Payslip,
  parameters: { layout: "padded" },
  args: {
    salary: 52_000,
    gross: 4_333.33,
    rows: [
      { id: "tax", label: "Income Tax", amount: 613.83 },
      { id: "ni", label: "National Insurance", amount: 254.22 },
      { id: "pension", label: "Pension (5%)", amount: 216.67 },
    ],
    net: 3_248.62,
  },
};

export default meta;
type Story = StoryObj<typeof Payslip>;

const assertSlip: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("article", { name: "Example payslip" })).toBeVisible();
  await expect(canvas.getByText("Example")).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertSlip };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSlip,
};
