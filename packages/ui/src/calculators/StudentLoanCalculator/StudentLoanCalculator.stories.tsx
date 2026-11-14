import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { STUDENT_LOAN_COPY, StudentLoanCalculator } from "./StudentLoanCalculator";

const meta: Meta<typeof StudentLoanCalculator> = {
  title: "3. Calculators/StudentLoanCalculator",
  component: StudentLoanCalculator,
  parameters: { layout: "padded" },
  args: { onSaveAndContinue: fn(), persistSeed: false },
};

export default meta;
type Story = StoryObj<typeof StudentLoanCalculator>;

const play: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const outcomes = within(canvas.getByTestId("student-loan-outcomes"));
  await expect(outcomes.getByText("£65")).toBeInTheDocument();

  // Typing in the salary pill recalculates the repayment.
  const salary = canvas.getByLabelText(`${STUDENT_LOAN_COPY.salary} input`);
  await userEvent.clear(salary);
  await userEvent.type(salary, "120000");
  await userEvent.tab();
  await expect(await outcomes.findByText("£680")).toBeInTheDocument();

  await userEvent.selectOptions(canvas.getByLabelText(STUDENT_LOAN_COPY.plan), "plan5");

  await userEvent.click(canvas.getByRole("button", { name: /Continue to sign up/ }));
  await expect(args.onSaveAndContinue).toHaveBeenCalledWith(
    expect.objectContaining({ annualIncome: 120000, studentLoanPlan: "plan5" }),
  );
};

export const Default: Story = { play };

export const Light: Story = { ...Default, globals: { theme: "light" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
