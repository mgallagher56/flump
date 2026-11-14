import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { TypographyScale } from "./TypographyScale";

const meta: Meta<typeof TypographyScale> = {
  title: "1. Foundations/Typography & Tabular Numbers",
  component: TypographyScale,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof TypographyScale>;

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Text styles")).toBeInTheDocument();
  },
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Type scale and tabular numbers")).toBeInTheDocument();
    await expect(canvas.getByText("Tabular numbers line up")).toBeInTheDocument();
  },
};
