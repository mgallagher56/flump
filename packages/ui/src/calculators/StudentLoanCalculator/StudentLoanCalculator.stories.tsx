import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { STUDENT_LOAN_COPY, StudentLoanCalculator } from "./StudentLoanCalculator";

const meta: Meta<typeof StudentLoanCalculator> = {
  title: "5. Calculators/StudentLoanCalculator",
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

/** As on a tool page: the page shows the title and description, so the calculator does not. */
export const Embedded: Story = {
  args: { embedded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(STUDENT_LOAN_COPY.title)).not.toBeInTheDocument();
    // No heading is left to skip a level: the explainer is a quiet drawer, closed by default.
    await expect(canvas.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    const explainer = canvas.getByRole("button", { name: STUDENT_LOAN_COPY.explainerTitle });
    await expect(explainer).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(explainer);
    await expect(explainer).toHaveAttribute("aria-expanded", "true");
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
