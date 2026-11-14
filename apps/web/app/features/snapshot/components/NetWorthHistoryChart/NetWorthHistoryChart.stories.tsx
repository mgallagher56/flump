import { DEFAULT_NET_WORTH_BASIS } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { EXAMPLE_ACCOUNTS, exampleDetails, TREND_MONTHS, TWO_MONTHS } from "../../fixtures";
import { buildSnapshotHistory, toChartPoints } from "../../snapshotModel";
import { NetWorthHistoryChart } from "./NetWorthHistoryChart";

const trend = buildSnapshotHistory(
  EXAMPLE_ACCOUNTS,
  exampleDetails(TREND_MONTHS),
  "2026-11",
  DEFAULT_NET_WORTH_BASIS,
);
const pair = buildSnapshotHistory(
  EXAMPLE_ACCOUNTS,
  exampleDetails(TWO_MONTHS),
  "2026-11",
  DEFAULT_NET_WORTH_BASIS,
);

const meta: Meta<typeof NetWorthHistoryChart> = {
  title: "4. Charts/Snapshot/NetWorthHistoryChart",
  component: NetWorthHistoryChart,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof NetWorthHistoryChart>;

export const TrendWithGap: Story = {
  args: {
    points: toChartPoints(trend.series),
    recordedMonths: trend.recordedMonths,
    summary: "Example net worth each month.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Carried forward (no check-in)")[0]).toBeDefined();
  },
};

export const TooFewMonths: Story = {
  args: {
    points: toChartPoints(pair.series),
    recordedMonths: pair.recordedMonths,
    summary: "Example net worth for the latest month.",
    notEnoughDataText:
      "You have two months of history. The chart appears after your third check-in.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/The chart appears after your third check-in/)).toBeDefined();
    await expect(canvas.queryByTestId("net-worth-history-chart")).toBeNull();
  },
};
