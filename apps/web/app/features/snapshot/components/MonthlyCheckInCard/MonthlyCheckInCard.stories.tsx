import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MonthlyCheckInCard } from "./MonthlyCheckInCard";

const meta: Meta<typeof MonthlyCheckInCard> = {
  title: "3. Financial Patterns & Sections/Snapshot/MonthlyCheckInCard",
  component: MonthlyCheckInCard,
  parameters: { layout: "padded" },
  args: { currentMonth: "2026-11", lastRecordedMonth: "2026-10" },
};

export default meta;
type Story = StoryObj<typeof MonthlyCheckInCard>;

export const LastMonthRecorded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/Last recorded month: October 2026/)[0]).toBeDefined();
  },
};

export const ThisMonthRecorded: Story = { args: { lastRecordedMonth: "2026-11" } };

export const NothingRecorded: Story = {
  args: { lastRecordedMonth: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/Record your balances once a month/)[0]).toBeDefined();
  },
};
