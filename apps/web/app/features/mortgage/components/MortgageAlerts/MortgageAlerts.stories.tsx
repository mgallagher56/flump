import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { MortgageAlerts } from "./MortgageAlerts";

const meta: Meta<typeof MortgageAlerts> = {
  title: "3. Patterns/Mortgage/MortgageAlerts",
  component: MortgageAlerts,
  parameters: { layout: "padded" },
  args: {
    refinanceWarning: { diffMonths: 3, date: "2027-02-01" },
    onModelRateChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageAlerts>;

export const EndsSoon: Story = {
  play: async ({ canvasElement, args }) => {
    const text = canvasElement.textContent ?? "";
    await expect(text).not.toMatch(/worth comparing|usually raises|shock/i);
    const button = within(canvasElement).getAllByRole("button", { name: "Model a rate change" })[0];
    if (!button) throw new Error("Model a rate change button missing");
    await userEvent.click(button);
    await expect(args.onModelRateChange).toHaveBeenCalled();
  },
};

export const FixedRateEnded: Story = {
  args: { refinanceWarning: { diffMonths: 0, date: "2026-10-01" } },
};

export const Dark: Story = { globals: { theme: "dark" } };
