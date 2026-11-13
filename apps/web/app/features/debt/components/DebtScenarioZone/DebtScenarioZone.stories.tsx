import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { DebtScenarioZone } from "./DebtScenarioZone";

const meta: Meta<typeof DebtScenarioZone> = {
  title: "3. Financial Patterns & Sections/DebtScenarioZone",
  component: DebtScenarioZone,
  parameters: { layout: "padded" },
  args: {
    basis: "Starting from your figures: £8,400 owed across 2 debts, £240 a month in minimums",
    isModified: false,
    onReset: fn(),
    children: <p>Scenario tools go here.</p>,
  },
};

export default meta;
type Story = StoryObj<typeof DebtScenarioZone>;

// The Storybook decorator renders light and dark side by side, so queries use the "all" variants.
export const Unmodified: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Model a change to your debts").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Illustration, not saved").length).toBeGreaterThan(0);
    await expect(canvas.queryAllByRole("button", { name: "Reset to saved figures" })).toHaveLength(
      0,
    );
  },
};

export const Modified: Story = {
  args: { isModified: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Reset to saved figures" })[0] as HTMLElement,
    );
    await expect(args.onReset).toHaveBeenCalled();
  },
};
