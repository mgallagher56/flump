import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { SpacingAndRadii } from "./SpacingAndRadii";

const meta: Meta<typeof SpacingAndRadii> = {
  title: "1. Foundations/Spacing, Radii & Elevation",
  component: SpacingAndRadii,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof SpacingAndRadii>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Spacing, Border Radii & Elevation")).toBeInTheDocument();
  },
};
