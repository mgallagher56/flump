import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TBody, Td, THead, Th } from "./Table";

describe("Table Primitive", () => {
  it("renders financial table with headers and tabular rows", () => {
    render(
      <Table>
        <THead>
          <tr>
            <Th>Account</Th>
            <Th numeric>Balance</Th>
          </tr>
        </THead>
        <TBody>
          <tr>
            <Td>Vanguard LifeStrategy 80%</Td>
            <Td numeric>£34,850</Td>
          </tr>
        </TBody>
      </Table>,
    );

    expect(screen.getByText("Account")).toBeDefined();
    expect(screen.getByText("£34,850")).toBeDefined();
  });
});
