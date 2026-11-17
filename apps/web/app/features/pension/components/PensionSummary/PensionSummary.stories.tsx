import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, within } from "storybook/test";
import { PensionSummary } from "./PensionSummary";

const meta: Meta<typeof PensionSummary> = {
  title: "3. Patterns/Pension/PensionSummary",
  component: PensionSummary,
  parameters: { layout: "padded" },
  args: {
    totalValue: 96000,
    potsCount: 1,
    monthlyTotal: 532,
    onAddPot: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PensionSummary>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBeGreaterThan(0);
    await expect(within(canvasElement).getAllByText("Going in each month")[0]).toBeDefined();
    await expect(within(canvasElement).queryAllByText("Income at retirement")).toHaveLength(0);
  },
};

export const NoPots: Story = {
  args: { potsCount: 0, totalValue: 0 },
  play: async ({ canvasElement, args }) => {
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
    within(canvasElement).getAllByRole("button", { name: "Add pension pot" })[0]?.click();
    await expect(args.onAddPot).toHaveBeenCalled();
  },
};

export const NoSalary: Story = {
  args: { monthlyTotal: null },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText("Add your salary to see what goes in each month")[0],
    ).toBeDefined();
  },
};
