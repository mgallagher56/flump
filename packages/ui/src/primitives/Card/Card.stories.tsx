import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Card } from "./Card";

const meta: Meta<typeof Card> = {
  title: "2. Primitives/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  args: {
    children: "SIPP & Workplace Pension Overview",
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Resting: Story = {
  args: {
    elevation: "resting",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("SIPP & Workplace Pension Overview")).toBeInTheDocument();
  },
};

export const Interactive: Story = {
  args: {
    elevation: "interactive",
  },
};

export const Floating: Story = {
  args: {
    elevation: "floating",
  },
};
