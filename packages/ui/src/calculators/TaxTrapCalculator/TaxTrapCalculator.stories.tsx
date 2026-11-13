import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

const meta: Meta<typeof TaxTrapCalculator> = {
  title: "3. Calculators/TaxTrapCalculator",
  component: TaxTrapCalculator,
};

export default meta;
type Story = StoryObj<typeof TaxTrapCalculator>;

// E8 waiver: color-contrast
const a11y = { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } };

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Estimated tax and NI saved")).toBeInTheDocument();
};

export const Default: Story = { parameters: a11y, play };

export const Light: Story = { globals: { theme: "light" }, parameters: a11y, play };

export const Dark: Story = { globals: { theme: "dark" }, parameters: a11y, play };
