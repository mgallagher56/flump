import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Money } from "../Money";
import { StatusBadge } from "../StatusBadge";
import { Table, TBody, Td, THead, Th, Tr } from "./Table";

const panel = css({
  backgroundColor: "surface.card",
  borderRadius: "xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  padding: { base: "4", md: "6" },
  maxWidth: "960px",
});

const meta: Meta<typeof Table> = {
  title: "2. Primitives/Table",
  component: Table,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className={panel}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
  render: () => (
    <Table appearance="soft" caption="Debts by APR" stacked>
      <THead>
        <Tr>
          <Th>Debt name</Th>
          <Th>Type</Th>
          <Th numeric>APR</Th>
          <Th numeric>Balance</Th>
          <Th numeric>Minimum payment</Th>
        </Tr>
      </THead>
      <TBody>
        <Tr>
          <Td>Barclaycard Platinum</Td>
          <Td label="Type">Credit card</Td>
          <Td label="APR" numeric>
            24.9%
          </Td>
          <Td label="Balance" numeric>
            £3,200
          </Td>
          <Td label="Minimum payment" numeric>
            £80/mo
          </Td>
        </Tr>
        <Tr>
          <Td>Lloyds Overdraft</Td>
          <Td label="Type">Overdraft</Td>
          <Td label="APR" numeric>
            39.9%
          </Td>
          <Td label="Balance" numeric>
            £1,000
          </Td>
          <Td label="Minimum payment" numeric>
            £40/mo
          </Td>
        </Tr>
      </TBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Barclaycard Platinum")).toBeInTheDocument();
    await expect(canvas.getByText("£3,200")).toBeInTheDocument();
    await expect(canvas.getByRole("table", { name: "Debts by APR" })).toBeInTheDocument();
    await expect(canvas.getAllByRole("columnheader")[0]).toHaveAttribute("scope", "col");
  },
};

const ACCOUNTS = [
  { name: "Monzo joint account", kind: "Current account", balance: 2184.32, change: 312.5 },
  { name: "Marcus easy access saver", kind: "Savings, 4.5% AER", balance: 18450, change: 150 },
  {
    name: "Vanguard LifeStrategy 80% Equity Fund stocks and shares ISA",
    kind: "Stocks and shares ISA, updated 3 days ago",
    balance: 34850.17,
    change: -420.9,
  },
  { name: "Barclaycard Platinum", kind: "Credit card", balance: -3200, change: 80 },
] as const;

/** The "Accounts (sample data)" table from the Direction C sign-off frame. */
export const Accounts: Story = {
  render: () => (
    <Table
      appearance="soft"
      caption="Sample accounts with balance and change since last month"
      showCaption
      stacked
    >
      <THead>
        <Tr>
          <Th>Account</Th>
          <Th numeric>Balance</Th>
          <Th numeric>Change</Th>
          <Th>Status</Th>
        </Tr>
      </THead>
      <TBody>
        {ACCOUNTS.map((a, index) => (
          <Tr key={a.name}>
            <Td secondary={a.kind}>{a.name}</Td>
            <Td label="Balance" numeric>
              <Money fractionDigits={2} size="sm" value={a.balance} />
            </Td>
            <Td label="Change" numeric>
              <Money fractionDigits={2} signDisplay="always" size="sm" value={a.change} />
            </Td>
            <Td label="Status">
              {index === 3 ? (
                <StatusBadge showIcon variant="danger">
                  Overdue
                </StatusBadge>
              ) : index === 2 ? (
                <StatusBadge showIcon variant="info">
                  Estimate
                </StatusBadge>
              ) : (
                <StatusBadge showIcon variant="positive">
                  Paid on time
                </StatusBadge>
              )}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Accounts", { exact: false })).toBeInTheDocument();
    await expect(canvas.getByText("Savings, 4.5% AER")).toBeInTheDocument();
    await expect(canvas.getAllByRole("columnheader")).toHaveLength(4);
  },
};

const MANY = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  payee: `Payee number ${i + 1}`,
  date: `${String((i % 28) + 1).padStart(2, "0")}/10/2026`,
  amount: -((i + 1) * 17.35),
}));

export const StickyHeader: Story = {
  args: { appearance: "soft", stickyHeader: true, stacked: true },
  render: (args) => (
    <Table {...args} caption="Recent transactions">
      <THead>
        <Tr>
          <Th>Payee</Th>
          <Th>Date</Th>
          <Th numeric>Amount</Th>
        </Tr>
      </THead>
      <TBody>
        {MANY.map((row) => (
          <Tr key={row.id}>
            <Td>{row.payee}</Td>
            <Td label="Date">{row.date}</Td>
            <Td label="Amount" numeric>
              <Money fractionDigits={2} size="sm" value={row.amount} />
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("row")).toHaveLength(25);
    await expect(canvas.getAllByRole("cell")[0]).toBeInTheDocument();
  },
};

export const Classic: Story = {
  render: () => (
    <Table caption="Tax bands">
      <THead>
        <tr>
          <Th>Band</Th>
          <Th numeric>From</Th>
          <Th numeric>Rate</Th>
        </tr>
      </THead>
      <TBody>
        <tr>
          <Td>Personal allowance</Td>
          <Td numeric>£0</Td>
          <Td numeric>0%</Td>
        </tr>
        <tr>
          <Td>Basic rate</Td>
          <Td numeric>£12,571</Td>
          <Td numeric>20%</Td>
        </tr>
      </TBody>
    </Table>
  ),
};
