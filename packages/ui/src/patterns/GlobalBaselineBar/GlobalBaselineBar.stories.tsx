import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { GlobalBaselineBar } from "./GlobalBaselineBar";

const meta: Meta<typeof GlobalBaselineBar> = {
  title: "3. Financial Patterns & Sections/GlobalBaselineBar",
  component: GlobalBaselineBar,
  parameters: {
    layout: "padded",
  },
  args: {
    salary: 62000,
    pensionPct: 7.5,
    isSalarySacrifice: true,
    region: "UK PAYE",
    stageName: "Stage 3: Wealth Optimize",
    stageVariant: "brand",
    isWhatIfActive: false,
  },
};

export default meta;
type Story = StoryObj<typeof GlobalBaselineBar>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("£62,000")).toBeInTheDocument();
    await expect(canvas.getByText("Stage 3: Wealth Optimize")).toBeInTheDocument();
  },
};

export const WhatIfActive: Story = {
  args: {
    isWhatIfActive: true,
    salary: 75000,
    pensionPct: 12,
  },
};
