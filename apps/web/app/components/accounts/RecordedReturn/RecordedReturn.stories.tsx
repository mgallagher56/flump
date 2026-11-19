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
    await expect(canvas.getByText("Your estimated annual return")).toBeDefined();
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
