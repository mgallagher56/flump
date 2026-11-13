import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { EXAMPLE_ACCOUNTS, exampleDetails, ONE_MONTH, TREND_MONTHS } from "../../fixtures";
import { buildSnapshotHistory, projectFromSnapshot, toChartPoints } from "../../snapshotModel";
import { NetWorthHistoryChart } from "./NetWorthHistoryChart";

const trend = buildSnapshotHistory(EXAMPLE_ACCOUNTS, exampleDetails(TREND_MONTHS), "2026-11");
const single = buildSnapshotHistory(EXAMPLE_ACCOUNTS, exampleDetails(ONE_MONTH), "2026-10");

const meta: Meta<typeof NetWorthHistoryChart> = {
  title: "3. Financial Patterns & Sections/Snapshot/NetWorthHistoryChart",
  component: NetWorthHistoryChart,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof NetWorthHistoryChart>;

export const TrendWithGap: Story = {
  args: { points: toChartPoints(trend.series), summary: "Example net worth over 13 months." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Carried forward (no check-in)")[0]).toBeDefined();
  },
};

export const SingleWithProjection: Story = {
  args: {
    points: toChartPoints(single.series),
    projection: single.latestRecorded ? projectFromSnapshot(single.latestRecorded, 420, 6) : [],
    summary: "Example first month with a projection.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Projection")[0]).toBeDefined();
  },
};
