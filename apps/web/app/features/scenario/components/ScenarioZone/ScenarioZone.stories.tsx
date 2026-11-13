import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { ScenarioZone } from "./ScenarioZone";

const meta: Meta<typeof ScenarioZone> = {
  title: "3. Financial Patterns & Sections/Scenario/ScenarioZone",
  component: ScenarioZone,
  parameters: { layout: "padded" },
  args: {
    title: "Model a change to your pay",
    basis: "£62,000 gross salary, 5% pension",
    isModified: true,
    onReset: fn(),
    children: "Scenario tools go here.",
  },
};

export default meta;
type Story = StoryObj<typeof ScenarioZone>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Modified: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: "Reset to saved figures" })[0]);
    await expect(args.onReset).toHaveBeenCalled();
  },
};

export const Untouched: Story = { args: { isModified: false } };
