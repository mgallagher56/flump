import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { KpiCard } from "./KpiCard";

const meta: Meta<typeof KpiCard> = {
  title: "2. Primitives/KpiCard",
  component: KpiCard,
  parameters: {
    layout: "centered",
  },
  args: {
    label: "Debt-Free Horizon",
    value: "August 2026",
    deltaText: "14 months saved",
    deltaVariant: "positive",
    subtext: "Using Avalanche strategy with +£50/mo overpayment",
  },
};

export default meta;
type Story = StoryObj<typeof KpiCard>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Debt-Free Horizon")).toBeInTheDocument();
    await expect(canvas.getByText("August 2026")).toBeInTheDocument();
  },
};
