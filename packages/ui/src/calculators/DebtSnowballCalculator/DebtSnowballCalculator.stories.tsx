import type { Meta, StoryObj } from "@storybook/react";
import { DebtSnowballCalculator } from "./DebtSnowballCalculator";

const meta: Meta<typeof DebtSnowballCalculator> = {
  title: "3. Calculators/DebtSnowballCalculator",
  component: DebtSnowballCalculator,
};

export default meta;
type Story = StoryObj<typeof DebtSnowballCalculator>;

export const Default: Story = {};
