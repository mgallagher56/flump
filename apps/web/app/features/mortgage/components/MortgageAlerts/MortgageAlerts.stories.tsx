import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { MortgageAlerts } from "./MortgageAlerts";

const meta: Meta<typeof MortgageAlerts> = {
  title: "3. Financial Patterns & Sections/MortgageAlerts",
  component: MortgageAlerts,
  parameters: { layout: "padded" },
  args: {
    refinanceWarning: { diffMonths: 3, date: "2027-02-01" },
    showMissingAccount: true,
    onAddAccount: fn(),
    onSimulateRateShock: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageAlerts>;

export const Both: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getAllByRole("button", { name: "Add account" })[0];
    if (!button) throw new Error("Add account button missing");
    await userEvent.click(button);
    await expect(args.onAddAccount).toHaveBeenCalled();
  },
};

export const RefinanceOnly: Story = {
  args: { showMissingAccount: false },
  play: async ({ canvasElement }) => {
    const text = canvasElement.textContent ?? "";
    await expect(text).not.toMatch(/worth comparing|usually raises/i);
  },
};

export const FixedRateEnded: Story = {
  args: { showMissingAccount: false, refinanceWarning: { diffMonths: 0, date: "2026-10-01" } },
};

export const Dark: Story = { args: { showMissingAccount: false }, globals: { theme: "dark" } };
