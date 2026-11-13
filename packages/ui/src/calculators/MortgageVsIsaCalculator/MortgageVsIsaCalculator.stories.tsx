import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { MortgageVsIsaCalculator } from "./MortgageVsIsaCalculator";

const meta: Meta<typeof MortgageVsIsaCalculator> = {
  title: "3. Calculators/MortgageVsIsaCalculator",
  component: MortgageVsIsaCalculator,
};

export default meta;
type Story = StoryObj<typeof MortgageVsIsaCalculator>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId("mortgage-vs-isa-tool")).toBeInTheDocument();
};

export const Light: Story = {
  globals: { theme: "light" },
  play,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play,
};
