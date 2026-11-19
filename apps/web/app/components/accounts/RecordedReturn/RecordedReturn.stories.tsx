import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import RecordedReturn from "./RecordedReturn";

const meta: Meta<typeof RecordedReturn> = {
  title: "3. Patterns/Accounts/RecordedReturn",
  component: RecordedReturn,
  tags: ["autodocs"],
  args: { id: "recorded-return" },
};

export default meta;
type Story = StoryObj<typeof RecordedReturn>;

/** 25 months: Jan 2024 to Jan 2026, 1% a month for a year, then flat, with £200 paid in. */
const twoYears = Array.from({ length: 25 }, (_, i) => ({
  year: 2024 + Math.floor(i / 12),
  month: (i % 12) + 1,
  value: Math.round(10000 * 1.01 ** Math.min(i, 12) + 200 * i),
}));

export const WithHistory: Story = {
  args: { balances: twoYears, monthlyContribution: 200, assumedAnnualReturn: 5 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Overall, a year on average")).toBeDefined();
    await expect(canvas.getByText("Investment returns can go down as well as up.")).toBeDefined();
    await expect(
      canvas.getByText("The estimated annual return you set for this account is 5%."),
    ).toBeDefined();
  },
};

export const AFall: Story = {
  args: {
    balances: [
      { year: 2026, month: 3, value: 10000 },
      { year: 2026, month: 4, value: 9500 },
      { year: 2026, month: 5, value: 9025 },
    ],
    monthlyContribution: null,
    assumedAnnualReturn: null,
  },
};

export const NotEnoughHistory: Story = {
  args: {
    balances: [
      { year: 2026, month: 9, value: 10000 },
      { year: 2026, month: 10, value: 10100 },
    ],
    monthlyContribution: 200,
    assumedAnnualReturn: 5,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Not enough history yet/)).toBeDefined();
  },
};

export const WithHistoryDark: Story = {
  ...WithHistory,
  globals: { theme: "dark" },
};

/** 1,000 flat while 500 a month is set: the balances do not show the payments. */
export const ContributionNotShown: Story = {
  args: {
    balances: [
      { year: 2026, month: 1, value: 1000 },
      { year: 2026, month: 2, value: 1000 },
      { year: 2026, month: 3, value: 1000 },
    ],
    monthlyContribution: 500,
    assumedAnnualReturn: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Not enough reliable history/)).toBeDefined();
    await expect(canvas.getByText(/do not show the £500 paid in each month/)).toBeDefined();
  },
};

export const ContributionNotShownDark: Story = {
  ...ContributionNotShown,
  globals: { theme: "dark" },
};

/** February to March rises by 30%, beyond the 25% bound. */
export const ImplausibleMonth: Story = {
  args: {
    balances: [
      { year: 2026, month: 1, value: 1000 },
      { year: 2026, month: 2, value: 1010 },
      { year: 2026, month: 3, value: 1313 },
    ],
    monthlyContribution: null,
    assumedAnnualReturn: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/between February 2026 and March 2026/)).toBeDefined();
  },
};

export const ImplausibleMonthDark: Story = {
  ...ImplausibleMonth,
  globals: { theme: "dark" },
};
