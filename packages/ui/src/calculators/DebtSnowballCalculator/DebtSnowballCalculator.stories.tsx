import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { DebtSnowballCalculator } from "./DebtSnowballCalculator";

const meta: Meta<typeof DebtSnowballCalculator> = {
  title: "3. Calculators/DebtSnowballCalculator",
  component: DebtSnowballCalculator,
};

export default meta;
type Story = StoryObj<typeof DebtSnowballCalculator>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByLabelText("Credit card balance")).toBeInTheDocument();
  await expect(canvas.getByText(/Debt free:/)).toBeInTheDocument();
};

export const Default: Story = { play };

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
