import type { AvalancheVsSnowballComparison } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PayoffStrategySwitcher } from "./PayoffStrategySwitcher";

const comparison: AvalancheVsSnowballComparison = {
  avalanche: {
    months: 31,
    debtFreeDate: "June 2029",
    totalInterest: 1416,
    totalPaid: 8916,
    monthlySchedule: [],
  },
  snowball: {
    months: 33,
    debtFreeDate: "August 2029",
    totalInterest: 1620,
    totalPaid: 9120,
    monthlySchedule: [],
  },
  minimumOnly: {
    months: 58,
    debtFreeDate: "September 2031",
    totalInterest: 3210,
    totalPaid: 10710,
    monthlySchedule: [],
  },
  interestSavedAvalancheVsMin: 1794,
  monthsShavedAvalancheVsMin: 27,
  interestSavedAvalancheVsSnowball: 204,
  snowballFirstWinDescription: "",
};

const meta: Meta<typeof PayoffStrategySwitcher> = {
  title: "3. Financial Patterns & Sections/PayoffStrategySwitcher",
  component: PayoffStrategySwitcher,
  parameters: { layout: "padded" },
  args: {
    comparison,
    budgetSurplus: 400,
    extraPayment: 50,
    selectedStrategy: "avalanche",
    onChangeExtraPayment: fn(),
    onSelectStrategy: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PayoffStrategySwitcher>;

// The Storybook decorator renders light and dark side by side, so queries use the "all" variants.
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("Debt-free in 31 months, £1,416 interest").length,
    ).toBeGreaterThan(0);
    const snowball = canvas.getAllByRole("radio", { name: /Smallest balance first/ })[0];
    await userEvent.click(snowball as HTMLElement);
    await expect(args.onSelectStrategy).toHaveBeenCalledWith("snowball");
  },
};

export const NoExtraPayment: Story = {
  args: { extraPayment: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("No extra payment: this is the minimum payments only timeline.").length,
    ).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Minimum payments only").length).toBeGreaterThan(0);
  },
};

export const MatchSurplus: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Match surplus/ })[0] as HTMLElement,
    );
    await expect(args.onChangeExtraPayment).toHaveBeenCalledWith(400);
  },
};
