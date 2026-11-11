import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { ColorPalette } from "./ColorPalette";

const meta: Meta<typeof ColorPalette> = {
  title: "1. Foundations/Colors & Semantic Tokens",
  component: ColorPalette,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof ColorPalette>;

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Flump Color System & Semantic Tokens")).toBeInTheDocument();
  },
};
