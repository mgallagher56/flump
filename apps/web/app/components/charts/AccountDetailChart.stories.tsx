import type { Meta, StoryObj } from "@storybook/react";
import AccountDetailChart from "./AccountDetailChart";

const meta: Meta<typeof AccountDetailChart> = {
  title: "Charts/AccountDetailChart",
  component: AccountDetailChart,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div
        style={{
          width: "350px",
          height: "150px",
          background: "#20222D",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
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
