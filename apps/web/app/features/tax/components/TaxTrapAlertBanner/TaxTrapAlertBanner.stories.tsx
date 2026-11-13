import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { TaxTrapAlertBanner } from "./TaxTrapAlertBanner";

/**
 * The Storybook preview renders every story side by side in light and dark.
 * Rates come from the engine's two named fields, so the copy always agrees with itself.
 */
const meta: Meta<typeof TaxTrapAlertBanner> = {
  title: "Tax/TaxTrapAlertBanner",
  component: TaxTrapAlertBanner,
  tags: ["autodocs"],
  args: { grossIncome: 110000, onApplySacrifice: () => {} },
};

export default meta;
type Story = StoryObj<typeof TaxTrapAlertBanner>;

export const InTrap: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/60% income tax, 62% including NI/)).toBeTruthy();
  },
};

export const NearTrap: Story = {
  args: { grossIncome: 97000 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/62%/)).toBeNull();
  },
};
