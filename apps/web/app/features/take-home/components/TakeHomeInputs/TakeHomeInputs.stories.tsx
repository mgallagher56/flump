import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { TakeHomeInputs } from "./TakeHomeInputs";

const meta: Meta<typeof TakeHomeInputs> = {
  title: "3. Financial Patterns & Sections/Take-home/TakeHomeInputs",
  component: TakeHomeInputs,
  parameters: { layout: "padded" },
  args: {
    grossSalary: 62000,
    pensionPercent: 5,
    isSalarySacrifice: true,
    isSalarySacrificeEmployerNi: false,
    studentLoanPlan: "none",
    studentLoanPlans: [{ key: "plan2", name: "Plan 2", threshold: 29385 }],
    onGrossSalaryChange: fn(),
    onPensionPercentChange: fn(),
    onSalarySacrificeChange: fn(),
    onEmployerNiChange: fn(),
    onStudentLoanPlanChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TakeHomeInputs>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("switch", { name: /Salary sacrifice/ })[0]);
    await expect(args.onSalarySacrificeChange).toHaveBeenCalledWith(false);
  },
};

export const NoSalary: Story = { args: { grossSalary: 0 } };
