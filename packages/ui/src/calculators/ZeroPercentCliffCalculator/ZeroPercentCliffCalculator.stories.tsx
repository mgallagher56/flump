import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { ZeroPercentCliffCalculator } from "./ZeroPercentCliffCalculator";

const meta: Meta<typeof ZeroPercentCliffCalculator> = {
  title: "3. Calculators/ZeroPercentCliffCalculator",
  component: ZeroPercentCliffCalculator,
};

export default meta;
type Story = StoryObj<typeof ZeroPercentCliffCalculator>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId("zero-percent-cliff-tool")).toBeInTheDocument();
  const balance = canvas.getByLabelText("Current 0% card balance (£)");
  await userEvent.clear(balance);
  await userEvent.type(balance, "4800");
  await expect(await canvas.findByText(/£267 \/ month/)).toBeInTheDocument();
};

export const Default: Story = { play };

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
