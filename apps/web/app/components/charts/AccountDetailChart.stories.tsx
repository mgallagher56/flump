import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import AccountDetailChart from "./AccountDetailChart";

const meta: Meta<typeof AccountDetailChart> = {
  title: "4. Charts/AccountDetailChart",
  component: AccountDetailChart,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "720px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AccountDetailChart>;

const mockDetails = [
  { id: 1, account_id: "a", month: 1, year: 2026, value: 500 },
  { id: 2, account_id: "a", month: 2, year: 2026, value: 650 },
  { id: 3, account_id: "a", month: 3, year: 2026, value: 800 },
  { id: 4, account_id: "a", month: 4, year: 2026, value: 750 },
  { id: 5, account_id: "a", month: 5, year: 2026, value: 900 },
  { id: 6, account_id: "a", month: 6, year: 2026, value: 1100 },
];

export const Default: Story = {
  args: {
    accountDetails: mockDetails,
  },
};

/** Seven months ending on this month's saved balance: ticks May, Jul, Sep, Nov; dashed end. */
export const SavedEnd: Story = {
  args: {
    title: "Mortgage balance history",
    accountDetails: [
      { month: 5, year: 2026, value: 183000 },
      { month: 6, year: 2026, value: 182500 },
      { month: 7, year: 2026, value: 182000 },
      { month: 8, year: 2026, value: 181500 },
      { month: 9, year: 2026, value: 181000 },
      { month: 10, year: 2026, value: 180500, source: "calculated" },
      { month: 11, year: 2026, value: 180000, carried: true },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/^Down £3,000 since May 2026\./)).toBeDefined();
  },
};
