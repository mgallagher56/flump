import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { MortgageScenarioZone } from "./MortgageScenarioZone";

const meta: Meta<typeof MortgageScenarioZone> = {
  title: "3. Financial Patterns & Sections/MortgageScenarioZone",
  component: MortgageScenarioZone,
  parameters: { layout: "padded" },
  args: {
    basis: "Starting from your figures: £180,000 at 4.5%, 20 years left",
    children: "Scenario tools go here.",
    onReset: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageScenarioZone>;

export const Default: Story = {};

export const Modified: Story = {
  args: { isModified: true, announcement: "Interest saved £12,000" },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Reset to saved figures" }),
    );
    await expect(args.onReset).toHaveBeenCalled();
  },
};
