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

  it("defaults Th scope to col inside THead", () => {
    render(
      <Table>
        <THead>
          <tr>
            <Th>Account</Th>
          </tr>
        </THead>
      </Table>,
    );
    expect(screen.getByRole("columnheader", { name: "Account" }).getAttribute("scope")).toBe("col");
  });

  it("lets row headers pass scope=row explicitly and leaves Th outside THead unscoped", () => {
    render(
      <Table>
        <THead>
          <tr>
            <Th scope="row">Explicit</Th>
          </tr>
        </THead>
        <TBody>
          <tr>
            <Th scope="row">Vanguard</Th>
            <Th>Loose</Th>
          </tr>
        </TBody>
      </Table>,
    );
    expect(screen.getByText("Explicit").getAttribute("scope")).toBe("row");
    expect(screen.getByRole("rowheader", { name: "Vanguard" }).getAttribute("scope")).toBe("row");
    expect(screen.getByText("Loose").hasAttribute("scope")).toBe(false);
  });

  it("renders an optional visually hidden caption as the first child of the table", () => {
    render(
      <Table caption="Debts by APR">
        <THead>
          <tr>
            <Th>Debt</Th>
          </tr>
        </THead>
      </Table>,
    );
    const table = screen.getByRole("table", { name: "Debts by APR" });
    const caption = table.firstElementChild;
    expect(caption?.tagName).toBe("CAPTION");
    expect(caption?.textContent).toBe("Debts by APR");
  });

  it("renders no caption when none is given", () => {
    const { container } = render(
      <Table>
        <TBody />
      </Table>,
    );
    expect(container.querySelector("caption")).toBeNull();
  });
});
