import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

const meta: Meta<typeof TaxTrapCalculator> = {
  title: "3. Calculators/TaxTrapCalculator",
  component: TaxTrapCalculator,
};

export default meta;
type Story = StoryObj<typeof TaxTrapCalculator>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Estimated tax and NI saved")).toBeInTheDocument();
};

export const Default: Story = { play };

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
