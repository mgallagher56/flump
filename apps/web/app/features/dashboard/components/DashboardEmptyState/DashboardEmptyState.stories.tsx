import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { DashboardEmptyState } from "./DashboardEmptyState";

const meta: Meta<typeof DashboardEmptyState> = {
  title: "3. Financial Patterns & Sections/DashboardEmptyState",
  component: DashboardEmptyState,
  parameters: { layout: "padded" },
  args: { reason: "setup", onChooseWidgets: fn() },
};

export default meta;
type Story = StoryObj<typeof DashboardEmptyState>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Setup: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getAllByRole("link", { name: "Add an account" })[0];
    await expect(link?.getAttribute("href")).toBe("/app/accounts");
  },
};

export const AllHidden: Story = {
  args: { reason: "hidden" },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getAllByRole("button", {
      name: "Show or hide widgets",
    })[0];
    if (!button) throw new Error("Choose widgets button missing");
    await userEvent.click(button);
    await expect(args.onChooseWidgets).toHaveBeenCalled();
  },
};
