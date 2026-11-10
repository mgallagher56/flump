import type { Meta, StoryObj } from "@storybook/react";
import { StudentLoanCalculator } from "./StudentLoanCalculator";

const meta: Meta<typeof StudentLoanCalculator> = {
  title: "3. Calculators/StudentLoanCalculator",
  component: StudentLoanCalculator,
};

export default meta;
type Story = StoryObj<typeof StudentLoanCalculator>;

export const Default: Story = {};
