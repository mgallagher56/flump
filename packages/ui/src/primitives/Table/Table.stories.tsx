import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Table, TBody, Td, THead, Th } from "./Table";

const meta: Meta<typeof Table> = {
  title: "2. Primitives/Table",
  component: Table,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
  render: () => (
    <Table caption="Debts by APR">
      <THead>
        <tr>
          <Th>Debt Name</Th>
          <Th>Type</Th>
          <Th numeric>APR</Th>
          <Th numeric>Balance</Th>
          <Th numeric>Min Payment</Th>
        </tr>
      </THead>
      <TBody>
        <tr>
          <Td>Barclaycard Platinum</Td>
          <Td>Credit Card</Td>
          <Td numeric>24.9%</Td>
          <Td numeric>£3,200</Td>
          <Td numeric>£80/mo</Td>
        </tr>
        <tr>
          <Td>Lloyds Overdraft</Td>
          <Td>Overdraft</Td>
          <Td numeric>39.9%</Td>
          <Td numeric>£1,000</Td>
          <Td numeric>£40/mo</Td>
        </tr>
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

export const Dark: Story = {
  ...Default,
  globals: { theme: "dark" },
};
