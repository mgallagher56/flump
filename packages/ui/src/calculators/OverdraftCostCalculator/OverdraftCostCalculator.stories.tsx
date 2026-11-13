import type { Meta, StoryObj } from "@storybook/react";
import { OverdraftCostCalculator } from "./OverdraftCostCalculator";

const meta: Meta<typeof OverdraftCostCalculator> = {
  title: "3. Calculators/OverdraftCostCalculator",
  component: OverdraftCostCalculator,
};

export default meta;
type Story = StoryObj<typeof OverdraftCostCalculator>;

export const Default: Story = {};

export const Dark: Story = {
  globals: { theme: "dark" },
};

export const Light: Story = {
  globals: { theme: "light" },
};
