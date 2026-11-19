import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TableFilterSelect, TableToolbar } from "./TableToolbar";

describe("TableToolbar", () => {
  it("draws a labelled search field and reports what is typed", () => {
    const onSearchChange = vi.fn();
    render(
      <TableToolbar
        searchLabel="Search records"
        searchPlaceholder="Name or category"
        searchValue="rent"
        onSearchChange={onSearchChange}
      >
        <button type="button">Clear</button>
      </TableToolbar>,
    );
    const input = screen.getByRole("searchbox", { name: "Search records" }) as HTMLInputElement;
    expect(input.value).toBe("rent");
    expect(input.placeholder).toBe("Name or category");
    fireEvent.change(input, { target: { value: "laptop" } });
    expect(onSearchChange).toHaveBeenCalledWith("laptop");
    expect(screen.getByRole("button", { name: "Clear" })).toBeDefined();
  });

  it("draws no search field without a change handler, only the filter controls", () => {
    render(
      <TableToolbar>
        <button type="button">Clear</button>
      </TableToolbar>,
    );
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Clear" })).toBeDefined();
  });

  it("defaults the label to Search and treats a missing value as empty", () => {
    render(<TableToolbar onSearchChange={vi.fn()} />);
    expect((screen.getByRole("searchbox", { name: "Search" }) as HTMLInputElement).value).toBe("");
  });

  it("draws a category filter whose first option shows every row", () => {
    const onChange = vi.fn();
    render(
      <TableFilterSelect
        allLabel="All accounts"
        label="Account"
        options={[
          { value: "isa", label: "Cash ISA" },
          { value: "current", label: "Current account" },
        ]}
        value="all"
        onChange={onChange}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Account" }) as HTMLSelectElement;
    expect(select.value).toBe("all");
    expect(Array.from(select.options).map((o) => o.text)).toEqual([
      "All accounts",
      "Cash ISA",
      "Current account",
    ]);
    fireEvent.change(select, { target: { value: "isa" } });
    expect(onChange).toHaveBeenCalledWith("isa");
  });

  it("links its hint to the select and pairs id with data-testid", () => {
    render(
      <TableFilterSelect
        allLabel="All accounts"
        hint="Shows records from one account"
        label="Account"
        options={[{ value: "isa", label: "Cash ISA" }]}
        value="all"
        onChange={vi.fn()}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Account" });
    expect(select.getAttribute("data-testid")).toBe(select.id);
    const describedBy = select.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")?.textContent).toBe(
      "Shows records from one account",
    );
  });
});
