import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { StatusBadge } from "./StatusBadge";

const meta: Meta<typeof StatusBadge> = {
  title: "2. Primitives/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
  },
  args: {
    children: "Mathematically Optimal",
    variant: "positive",
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Positive: Story = {
  args: {
    variant: "positive",
    children: "+£12,480 Interest Saved",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("+£12,480 Interest Saved")).toBeInTheDocument();
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "0% Promo Ending in 62 Days",
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    children: "62% Marginal Tax Trap Active",
  },
};

export const Info: Story = {
  args: {
    variant: "info",
    children: "UK PAYE 2024-25",
  },
};

export const Brand: Story = {
  args: {
    variant: "brand",
    children: "Stage 3: Wealth Optimize",
  },
};
