import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { DashboardKpiStrip } from "./DashboardKpiStrip";

const meta: Meta<typeof DashboardKpiStrip> = {
  title: "3. Financial Patterns & Sections/DashboardKpiStrip",
  component: DashboardKpiStrip,
  parameters: { layout: "padded" },
  args: {
    netWorth: 50000,
    totalAssets: 60000,
    totalLiabilities: 10000,
    monthlySurplus: 1500,
    weeklySafeToSpend: 320,
    liquidCash: 12500,
  },
};

export default meta;
type Story = StoryObj<typeof DashboardKpiStrip>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("£50,000")[0]).toBeDefined();
  },
};

export const NotSet: Story = {
  args: {
    netWorth: null,
    totalAssets: null,
    totalLiabilities: null,
    monthlySurplus: null,
    weeklySafeToSpend: null,
    liquidCash: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set").length).toBeGreaterThan(0);
    await expect(canvas.getAllByRole("link", { name: "Add an account" })[0]).toBeDefined();
  },
};

/** Commitments go past take-home: the shortfall is named, not shown as a bare £0. */
export const Shortfall: Story = {
  args: { weeklySafeToSpend: 0, safeToSpendShortfall: 120, monthlySurplus: -120 },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText(/a month more than take-home/)[0],
    ).toBeDefined();
  },
};
