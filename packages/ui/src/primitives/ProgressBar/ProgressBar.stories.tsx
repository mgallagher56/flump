import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { ProgressBar } from "./ProgressBar";

const meta: Meta<typeof ProgressBar> = {
  title: "2. Primitives/ProgressBar",
  component: ProgressBar,
  parameters: {
    layout: "centered",
  },
  args: {
    label: "£20,000 ISA Annual Allowance",
    value: 12000,
    max: 20000,
    showPercent: true,
    variant: "positive",
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Positive: Story = {
  args: {
    variant: "positive",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar");
    await expect(bar).toBeInTheDocument();
    await expect(canvas.getByText("60%")).toBeInTheDocument();
  },
};

export const Warning: Story = {
  args: {
    value: 18500,
    variant: "warning",
  },
};

export const Danger: Story = {
  args: {
    value: 20000,
    variant: "danger",
  },
};
