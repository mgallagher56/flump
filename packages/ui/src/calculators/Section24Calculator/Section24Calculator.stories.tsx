import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Section24Calculator } from "./Section24Calculator";

const meta: Meta<typeof Section24Calculator> = {
  title: "3. Calculators/Section24Calculator",
  component: Section24Calculator,
};

export default meta;
type Story = StoryObj<typeof Section24Calculator>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId("section-24-tool")).toBeInTheDocument();
};

export const Light: Story = {
  globals: { theme: "light" },
  play,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play,
};
