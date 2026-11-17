import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TableToolbar } from "./TableToolbar";

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
});
