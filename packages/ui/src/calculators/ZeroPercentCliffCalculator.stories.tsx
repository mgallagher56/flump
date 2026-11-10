import type { Meta, StoryObj } from "@storybook/react";
import { ZeroPercentCliffCalculator } from "./ZeroPercentCliffCalculator";

const meta: Meta<typeof ZeroPercentCliffCalculator> = {
  title: "3. Calculators/ZeroPercentCliffCalculator",
  component: ZeroPercentCliffCalculator,
};

export default meta;
type Story = StoryObj<typeof ZeroPercentCliffCalculator>;

export const Default: Story = {};
