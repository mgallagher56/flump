import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { OverdraftCostCalculator } from "./OverdraftCostCalculator";

const meta: Meta<typeof OverdraftCostCalculator> = {
  title: "3. Calculators/OverdraftCostCalculator",
  component: OverdraftCostCalculator,
};

export default meta;
type Story = StoryObj<typeof OverdraftCostCalculator>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId("overdraft-cost-tool")).toBeInTheDocument();
  const balance = canvas.getByLabelText("Average overdraft balance used (£)");
  await userEvent.clear(balance);
  await userEvent.type(balance, "2000");
  await expect(await canvas.findByText(/£798 \/ year/)).toBeInTheDocument();
};

export const Default: Story = { play };

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
