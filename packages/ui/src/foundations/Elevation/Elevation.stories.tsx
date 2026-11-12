import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Elevation } from "./Elevation";

const meta: Meta<typeof Elevation> = {
  title: "1. Foundations/Elevation",
  component: Elevation,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Elevation>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("heading", { name: "Elevation" })[0]).toBeInTheDocument();
  await expect(canvas.getAllByTestId("elevation-overlay")[0]).toBeInTheDocument();
};

export const Default: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
