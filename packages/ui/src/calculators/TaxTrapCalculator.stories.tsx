import type { Meta, StoryObj } from "@storybook/react";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

const meta: Meta<typeof TaxTrapCalculator> = {
  title: "3. Calculators/TaxTrapCalculator",
  component: TaxTrapCalculator,
};

export default meta;
type Story = StoryObj<typeof TaxTrapCalculator>;

export const Default: Story = {};
