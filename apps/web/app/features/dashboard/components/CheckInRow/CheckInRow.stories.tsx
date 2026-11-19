import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { CheckInRow } from "./CheckInRow";

const meta: Meta<typeof CheckInRow> = {
  title: "3. Patterns/Dashboard/CheckInRow",
  component: CheckInRow,
  parameters: { layout: "padded" },
  args: { currentMonth: "2026-11", lastCheckInMonth: "2026-10" },
};

export default meta;
type Story = StoryObj<typeof CheckInRow>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Due: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Last check-in: October 2026")[0]).toBeVisible();
    await expect(canvas.getAllByRole("link", { name: "Start monthly check-in" })[0]).toBeVisible();
  },
};

export const NothingRecorded: Story = { args: { lastCheckInMonth: null } };
