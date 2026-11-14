import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { CheckInRow } from "./CheckInRow";

const meta: Meta<typeof CheckInRow> = {
  title: "3. Patterns/Dashboard/CheckInRow",
  component: CheckInRow,
  parameters: { layout: "padded" },
  args: { currentMonth: "2026-11", lastRecordedMonth: "2026-10" },
};

export default meta;
type Story = StoryObj<typeof CheckInRow>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Due: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("November balances not recorded yet")[0]).toBeVisible();
    await expect(canvas.getAllByRole("link", { name: "Update balances" })[0]).toBeVisible();
  },
};

export const NothingRecorded: Story = { args: { lastRecordedMonth: null } };
