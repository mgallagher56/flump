import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Motion } from "./Motion";

const meta: Meta<typeof Motion> = {
  title: "1. Foundations/Motion",
  component: Motion,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Motion>;

export const Default: Story = {
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { name: "Motion" })[0]).toBeInTheDocument();
    const toggle = canvas.getAllByRole("checkbox", { name: "Reduce motion" })[0];
    await userEvent.click(toggle);
    await expect(toggle).toBeChecked();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
