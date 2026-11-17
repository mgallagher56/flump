import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { FormField } from "../FormField";
import { Select } from "../Select";
import { Table, TBody, Td, THead, Th } from "../Table";
import { TableToolbar } from "./TableToolbar";

const RECORDS = [
  { name: "Design retainer", kind: "Income", amount: "£2,400" },
  { name: "Laptop", kind: "Cost", amount: "£1,150" },
  { name: "Saver interest", kind: "Income", amount: "£320" },
] as const;

/** A toolbar driving a small table: search by name and filter by type. */
const ToolbarWithTable = () => {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const rows = RECORDS.filter(
    (r) =>
      r.name.toLowerCase().includes(search.trim().toLowerCase()) &&
      (kind === "all" || r.kind === kind),
  );
  return (
    <div>
      <TableToolbar
        searchLabel="Search records"
        searchPlaceholder="Name"
        searchValue={search}
        onSearchChange={setSearch}
      >
        <FormField label="Type">
          {(field) => (
            <Select id={field.id} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">Income and costs</option>
              <option value="Income">Income</option>
              <option value="Cost">Costs</option>
            </Select>
          )}
        </FormField>
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
          {rows.map((r) => (
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
