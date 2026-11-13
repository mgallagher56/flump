import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataList, type DataListItem } from "./DataList";

const makeItems = (n: number): DataListItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `a${i + 1}`,
    label: `Account ${i + 1}`,
    secondary: "Current account",
    value: 1000 * (i + 1),
  }));

describe("DataList", () => {
  it("shows every row without a button when at or under the cap", () => {
    render(<DataList items={makeItems(8)} label="Accounts" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("caps at 8 and offers 'Show all N' with an en-GB formatted count", () => {
    render(<DataList items={makeItems(1234)} label="Accounts" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Show all 1,234 items" })).toBeDefined();
  });

  it("uses a custom noun and limit", () => {
    render(
      <DataList
        items={makeItems(5)}
        label="Accounts"
        limit={3}
        noun={{ one: "account", other: "accounts" }}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Show all 5 accounts" })).toBeDefined();
  });

  it("expands, moves focus to the first revealed row and announces the change", () => {
    render(<DataList items={makeItems(12)} label="Accounts" />);
    fireEvent.click(screen.getByRole("button", { name: "Show all 12 items" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("Account 9").closest("li"));
    expect(screen.getByRole("status").textContent).toBe("Showing all 12 items");
  });

  it("formats values with Money and shows Not set for null", () => {
    render(
      <DataList
        items={[
          { id: "a", label: "Savings", value: 1234.5, valueProps: { fractionDigits: 2 } },
          { id: "b", label: "Pension", value: null },
          { id: "c", label: "Note" },
        ]}
        label="Accounts"
      />,
    );
    expect(screen.getByText("£1,234.50")).toBeDefined();
    expect(screen.getByText("Not set")).toBeDefined();
  });

  it("renders a custom valueDisplay in place of the figure", () => {
    render(
      <DataList
        items={[{ id: "a", label: "Rent", valueDisplay: <span>Due Friday</span>, value: 5 }]}
        label="Bills"
      />,
    );
    expect(screen.getByText("Due Friday")).toBeDefined();
    expect(screen.queryByText("£5")).toBeNull();
  });
});
