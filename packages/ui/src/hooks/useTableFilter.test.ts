import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TABLE_FILTER_ALL, useTableFilter } from "./useTableFilter";

const ROWS = [
  { name: "Design retainer", category: "Consulting", kind: "income" },
  { name: "Laptop", category: "Equipment", kind: "expense" },
  { name: "Saver interest", category: "Interest", kind: "income" },
  { name: "Office chair", category: "Equipment", kind: "expense" },
];

const searchText = (r: (typeof ROWS)[number]) => [r.name, r.category];
const filters = { kind: (r: (typeof ROWS)[number]) => r.kind };

describe("useTableFilter", () => {
  it("shows every row until a search or filter is set", () => {
    const { result } = renderHook(() => useTableFilter({ rows: ROWS, searchText, filters }));
    expect(result.current.filteredRows).toHaveLength(4);
    expect(result.current.filterValues.kind).toBe(TABLE_FILTER_ALL);
    expect(result.current.isFiltered).toBe(false);
  });

  it("searches every text the row gives, ignoring case and spaces", () => {
    const { result } = renderHook(() => useTableFilter({ rows: ROWS, searchText, filters }));
    act(() => result.current.setQuery("  EQUIP "));
    expect(result.current.filteredRows.map((r) => r.name)).toEqual(["Laptop", "Office chair"]);
    expect(result.current.isFiltered).toBe(true);
  });

  it("counts a filter on its own as filtered", () => {
    const { result } = renderHook(() => useTableFilter({ rows: ROWS, searchText, filters }));
    act(() => result.current.setFilter("kind", "expense"));
    expect(result.current.isFiltered).toBe(true);
  });

  it("searches a single text the row gives", () => {
    const { result } = renderHook(() =>
      useTableFilter({ rows: ROWS, searchText: (r) => r.name, filters }),
    );
    act(() => result.current.setQuery("chair"));
    expect(result.current.filteredRows.map((r) => r.name)).toEqual(["Office chair"]);
  });

  it("filters by category and combines with the search", () => {
    const { result } = renderHook(() => useTableFilter({ rows: ROWS, searchText, filters }));
    act(() => result.current.setFilter("kind", "income"));
    expect(result.current.filteredRows.map((r) => r.name)).toEqual([
      "Design retainer",
      "Saver interest",
    ]);
    act(() => result.current.setQuery("saver"));
    expect(result.current.filteredRows.map((r) => r.name)).toEqual(["Saver interest"]);
  });

  it("resets the search and every filter", () => {
    const { result } = renderHook(() => useTableFilter({ rows: ROWS, searchText, filters }));
    act(() => {
      result.current.setQuery("laptop");
      result.current.setFilter("kind", "expense");
    });
    expect(result.current.filteredRows).toHaveLength(1);
    act(() => result.current.reset());
    expect(result.current.filteredRows).toHaveLength(4);
    expect(result.current.query).toBe("");
    expect(result.current.isFiltered).toBe(false);
  });

  it("ignores the query when the table has no search", () => {
    const { result } = renderHook(() => useTableFilter({ rows: ROWS, filters }));
    act(() => result.current.setQuery("nothing matches this"));
    expect(result.current.filteredRows).toHaveLength(4);
  });
});
