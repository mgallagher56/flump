import { Button } from "@repo/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartDataRow } from "./ChartDataRow";

const table = (
  <table aria-label="Balance by month">
    <tbody>
      <tr>
        <td>£1,000</td>
      </tr>
    </tbody>
  </table>
);

describe("ChartDataRow", () => {
  it("renders nothing with nothing to show", () => {
    const { container } = render(<ChartDataRow />);
    expect(container.firstChild).toBeNull();
  });

  it("puts the links in the same row as Show data, and opens the table in that row", () => {
    render(
      <ChartDataRow
        actions={
          <Button size="sm" type="button" variant="link">
            Add earlier months
          </Button>
        }
        table={table}
      />,
    );
    const showData = screen.getByRole("button", { name: "Show data" });
    const link = screen.getByRole("button", { name: "Add earlier months" });
    const row = link.parentElement?.parentElement as HTMLElement;
    expect(row.contains(showData)).toBe(true);
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(showData);
    expect(screen.getByRole("table", { name: "Balance by month" })).toBeDefined();
    expect(row.contains(screen.getByRole("table"))).toBe(true);
  });

  it("shows the links and the note without a table, and no Show data", () => {
    render(
      <ChartDataRow
        actions={<a href="/app/accounts">Add an account</a>}
        note="Next check-in: 1 December 2026"
      />,
    );
    expect(screen.queryByRole("button", { name: "Show data" })).toBeNull();
    expect(screen.getByRole("link", { name: "Add an account" })).toBeDefined();
    expect(screen.getByText("Next check-in: 1 December 2026")).toBeDefined();
  });
});
