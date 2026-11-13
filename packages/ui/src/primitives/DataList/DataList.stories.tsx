import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { StatusBadge } from "../StatusBadge";
import { DataList, type DataListItem } from "./DataList";

const panel = css({
  backgroundColor: "surface.card",
  borderRadius: "xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  padding: { base: "4", md: "6" },
  width: "min(560px, 92vw)",
});

const BANKS = [
  "Monzo",
  "Starling",
  "Nationwide",
  "Halifax",
  "Santander",
  "NatWest",
  "Barclays",
  "HSBC",
  "Lloyds",
  "Marcus",
  "Chase",
  "First Direct",
];

const accounts: DataListItem[] = BANKS.map((bank, i) => ({
  id: bank,
  label: `${bank} ${i % 3 === 0 ? "joint current account" : i % 3 === 1 ? "easy access saver" : "cash ISA"}`,
  secondary: i % 4 === 0 ? "Updated 3 days ago" : "Updated today",
  value: (i + 1) * 1234.56 * (i === 5 ? -1 : 1),
  valueProps: { fractionDigits: 2 },
}));

const meta: Meta<typeof DataList> = {
  title: "2. Primitives/DataList",
  component: DataList,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className={panel}>
        <Story />
      </div>
    ),
  ],
  args: {
    items: accounts,
    label: "Accounts",
    noun: { one: "account", other: "accounts" },
  },
};

export default meta;
type Story = StoryObj<typeof DataList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("listitem")).toHaveLength(8);
    await expect(canvas.getByRole("button", { name: "Show all 12 accounts" })).toBeInTheDocument();
  },
};

export const ShowAllWithPointer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Show all 12 accounts" }));
    await waitFor(() => expect(canvas.getAllByRole("listitem")).toHaveLength(12));
    await expect(canvas.queryByRole("button")).toBeNull();
    await expect(canvas.getByRole("status")).toHaveTextContent("Showing all 12 accounts");
  },
};

export const ShowAllWithKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    const button = canvas.getByRole("button", { name: "Show all 12 accounts" });
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getAllByRole("listitem")).toHaveLength(12));
    // Focus lands on the first row that was not visible before, so the reading position holds.
    await expect(canvas.getByText(/^Lloyds/).closest("li")).toHaveFocus();
  },
};

export const UnderTheCap: Story = {
  args: { items: accounts.slice(0, 5) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("listitem")).toHaveLength(5);
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const MixedValues: Story = {
  args: {
    items: [
      { id: "1", label: "Mortgage payment", secondary: "Due on the 1st", value: -1450 },
      { id: "2", label: "Pension contribution", secondary: "Workplace scheme", value: null },
      {
        id: "3",
        label: "Council tax",
        valueDisplay: (
          <StatusBadge showIcon variant="warning">
            Due in 3 days
          </StatusBadge>
        ),
        valueSecondary: "£182.00",
      },
      {
        id: "4",
        label: "Salary after tax",
        value: 3120.4,
        valueProps: { fractionDigits: 2, tone: "positive", signDisplay: "always" },
        valueSecondary: "Monthly",
      },
    ],
  },
};

export const LongContent: Story = {
  args: {
    items: [
      {
        id: "1",
        label:
          "Vanguard LifeStrategy 80% Equity Fund accumulation units held in a stocks and shares ISA",
        secondary:
          "Updated 3 days ago from your linked provider, balance is an estimate until the next sync",
        value: 1234567.89,
        valueProps: { fractionDigits: 2 },
      },
      { id: "2", label: "Emergency fund", secondary: "Marcus easy access saver", value: 6200 },
    ],
  },
};

export const Empty: Story = {
  args: { items: [] },
};
