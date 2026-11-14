import { DEFAULT_NET_WORTH_BASIS } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { EXAMPLE_ACCOUNTS, exampleDetails, TREND_MONTHS, TWO_MONTHS } from "../../fixtures";
import { buildSnapshotHistory } from "../../snapshotModel";
import { MonthlyChangeTable } from "./MonthlyChangeTable";

const pair = buildSnapshotHistory(
  EXAMPLE_ACCOUNTS,
  exampleDetails(TWO_MONTHS),
  "2026-10",
  DEFAULT_NET_WORTH_BASIS,
);
const trend = buildSnapshotHistory(
  EXAMPLE_ACCOUNTS,
  exampleDetails(TREND_MONTHS),
  "2026-11",
  DEFAULT_NET_WORTH_BASIS,
);

const meta: Meta<typeof MonthlyChangeTable> = {
  title: "3. Patterns/Snapshot/MonthlyChangeTable",
  component: MonthlyChangeTable,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof MonthlyChangeTable>;

export const ByAccount: Story = {
  args: {
    variant: "accounts",
    rows: pair.accountChanges,
    month: "2026-10",
    previousMonth: "2026-09",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Mortgage (owed)")[0]).toBeDefined();
  },
};

export const ByMonth: Story = {
  args: { variant: "months", rows: trend.monthChanges },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("table", { name: "Net worth change by month" })).toBeDefined();
  },
};
