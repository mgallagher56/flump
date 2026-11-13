import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { TaxTrapAlertBanner } from "./TaxTrapAlertBanner";

/**
 * The Storybook preview renders every story side by side in light and dark.
 * Shown only for adjusted net income between £90,000 and £125,140; facts only, no action.
 */
const meta: Meta<typeof TaxTrapAlertBanner> = {
  title: "Tax/TaxTrapAlertBanner",
  component: TaxTrapAlertBanner,
  tags: ["autodocs"],
  args: { adjustedNetIncome: 110000 },
};

export default meta;
type Story = StoryObj<typeof TaxTrapAlertBanner>;

export const InTaper: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/60% income tax, 62% including NI/).length).toBeGreaterThan(0);
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const NearThreshold: Story = {
  args: { adjustedNetIncome: 92000 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/62%/)).toBeNull();
  },
};

export const KnownScottishRegion: Story = {
  args: { adjustedNetIncome: 110000, region: "SCOTLAND" },
};

export const BelowBand: Story = {
  args: { adjustedNetIncome: 89999 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading")).toBeNull();
  },
};
