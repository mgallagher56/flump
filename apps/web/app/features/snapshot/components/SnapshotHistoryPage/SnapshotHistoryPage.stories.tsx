import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, within } from "storybook/test";
import {
  EXAMPLE_ACCOUNTS,
  exampleDetails,
  ONE_MONTH,
  TREND_MONTHS,
  TWO_MONTHS,
} from "../../fixtures";
import { SnapshotHistoryPage } from "./SnapshotHistoryPage";

const meta: Meta<typeof SnapshotHistoryPage> = {
  title: "6. Pages/Snapshot/SnapshotHistoryPage",
  component: SnapshotHistoryPage,
  parameters: { layout: "fullscreen" },
  args: {
    accounts: EXAMPLE_ACCOUNTS,
    accountDetails: [],
    currentMonth: "2026-11",
    onSave: fn(async () => true),
  },
};

export default meta;
type Story = StoryObj<typeof SnapshotHistoryPage>;

export const NoHistory: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("No monthly balances yet")[0]).toBeDefined();
  },
};

export const OneMonth: Story = {
  args: { accountDetails: exampleDetails(ONE_MONTH) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/You have one month of history/)[0]).toBeDefined();
  },
};

export const TwoMonths: Story = {
  args: { accountDetails: exampleDetails(TWO_MONTHS) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/You have two months of history/)[0]).toBeDefined();
  },
};

export const Trend: Story = {
  args: { accountDetails: exampleDetails(TREND_MONTHS) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/^Net worth each month since/)[0]).toBeDefined();
  },
};
