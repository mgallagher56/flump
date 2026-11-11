import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { __Name__ } from "./__Name__";

const meta: Meta<typeof __Name__> = {
  title: "TODO/__Name__",
  component: __Name__,
  args: { children: "Example content" },
  argTypes: { tone: { control: "select", options: ["neutral", "positive", "danger"] } },
};

export default meta;
type Story = StoryObj<typeof __Name__>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("__name__")).toBeInTheDocument();
  },
};

export const Positive: Story = { args: { tone: "positive" } };
export const Danger: Story = { args: { tone: "danger" } };
