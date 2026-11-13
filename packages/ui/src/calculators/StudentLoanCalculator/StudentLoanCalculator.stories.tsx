import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { StudentLoanCalculator } from "./StudentLoanCalculator";

const meta: Meta<typeof StudentLoanCalculator> = {
  title: "3. Calculators/StudentLoanCalculator",
  component: StudentLoanCalculator,
};

export default meta;
type Story = StoryObj<typeof StudentLoanCalculator>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId("student-loan-tool")).toBeInTheDocument();
  const figure = canvas.getByText(/\/mo \(£/);
  const before = figure.textContent;
  const salary = canvas.getByLabelText("Gross annual salary (£)");
  await userEvent.clear(salary);
  await userEvent.type(salary, "120000");
  await expect(canvas.getByText(/\/mo \(£/).textContent).not.toBe(before);
  const plan = canvas.getByLabelText("Student loan plan");
  await userEvent.selectOptions(plan, "plan5");
  await expect(plan).toHaveValue("plan5");
  await expect(canvas.getByText(/^Verdict: /)).toBeInTheDocument();
};

export const Default: Story = { play };

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
