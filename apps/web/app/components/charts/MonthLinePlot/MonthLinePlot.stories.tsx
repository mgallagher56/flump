import { ChartFigure } from "@repo/ui";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { toLinePoints } from "~/features/snapshot/snapshotModel";
import { MonthLinePlot } from "./MonthLinePlot";

const balances = [183000, 182500, 182000, 181500, 181000, 180500, 180000];
const points = toLinePoints(
  balances.map((value, i) => ({
    month: `2026-${String(i + 5).padStart(2, "0")}`,
    value,
    // This month's saved balance, not recorded yet: the dashed end.
    carried: i === balances.length - 1,
  })),
);
const last = points.at(-1);

const meta: Meta<typeof MonthLinePlot> = {
  title: "4. Charts/MonthLinePlot",
  component: MonthLinePlot,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ChartFigure
        annotation={last ? { x: last.label, label: "£180,000" } : undefined}
        directLabels
        minPoints={2}
        pointCount={points.length}
        summary="Down £3,000 since May 2026."
        title="Mortgage balance history"
      >
        <Story />
      </ChartFigure>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MonthLinePlot>;

/** Seven months ending on this month's saved balance: ticks May, Jul, Sep, Nov; dashed end. */
export const SavedEnd: Story = {
  args: { id: "month-line-plot-story", points, valueName: "Balance" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("month-line-plot-story")).toBeVisible();
    await expect(canvas.getByRole("figure", { name: "Mortgage balance history" })).toBeVisible();
  },
};

export const Dark: Story = {
  ...SavedEnd,
  globals: { theme: "dark" },
};
