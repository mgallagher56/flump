import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useTableFilter } from "../../hooks/useTableFilter";
import { Table, TBody, Td, THead, Th } from "../Table";
import { TableFilterSelect, TableToolbar } from "./TableToolbar";

const RECORDS = [
  { name: "Design retainer", kind: "Income", amount: "£2,400" },
  { name: "Laptop", kind: "Cost", amount: "£1,150" },
  { name: "Saver interest", kind: "Income", amount: "£320" },
] as const;

/** A toolbar driving a small table through `useTableFilter`: search by name and filter by type. */
const ToolbarWithTable = () => {
  const { filteredRows, query, setQuery, filterValues, setFilter } = useTableFilter({
    rows: RECORDS,
    searchText: (r) => r.name,
    filters: { kind: (r) => r.kind },
  });
  return (
    <div>
      <TableToolbar
        searchLabel="Search records"
        searchPlaceholder="Name"
        searchValue={query}
        onSearchChange={setQuery}
      >
        <TableFilterSelect
          allLabel="Income and costs"
          label="Type"
          options={[
            { value: "Income", label: "Income" },
            { value: "Cost", label: "Costs" },
          ]}
          value={filterValues.kind}
          onChange={(v) => setFilter("kind", v)}
        />
      </TableToolbar>
      <Table caption="Records for 2026/27">
        <THead>
          <tr>
            <Th text>Record</Th>
            <Th text>Type</Th>
            <Th numeric>Amount</Th>
          </tr>
        </THead>
        <TBody>
          {filteredRows.map((r) => (
            <tr key={r.name}>
              <Td>{r.name}</Td>
              <Td text>{r.kind}</Td>
              <Td numeric>{r.amount}</Td>
            </tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
};

const meta: Meta<typeof TableToolbar> = {
  title: "2. Primitives/TableToolbar",
  component: TableToolbar,
  parameters: { layout: "padded" },
  render: () => <ToolbarWithTable />,
};

export default meta;
type Story = StoryObj<typeof TableToolbar>;

const searchAndFilterPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const search = canvas.getByRole("searchbox", { name: "Search records" });
  await userEvent.type(search, "lap");
  await expect(canvas.getByText("Laptop")).toBeInTheDocument();
  await expect(canvas.queryByText("Design retainer")).toBeNull();
  await userEvent.clear(search);
  await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Type" }), "Income");
  await expect(canvas.getByText("Saver interest")).toBeInTheDocument();
  await expect(canvas.queryByText("Laptop")).toBeNull();
};

export const Default: Story = {
  globals: { theme: "light" },
  play: searchAndFilterPlay,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: searchAndFilterPlay,
};
