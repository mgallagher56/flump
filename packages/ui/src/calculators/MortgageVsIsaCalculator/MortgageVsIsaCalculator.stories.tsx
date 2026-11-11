import type { Meta, StoryObj } from "@storybook/react";
import { MortgageVsIsaCalculator } from "./MortgageVsIsaCalculator";

const meta: Meta<typeof MortgageVsIsaCalculator> = {
  title: "3. Calculators/MortgageVsIsaCalculator",
  component: MortgageVsIsaCalculator,
};

export default meta;
type Story = StoryObj<typeof MortgageVsIsaCalculator>;

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { test: "todo" } },
};
