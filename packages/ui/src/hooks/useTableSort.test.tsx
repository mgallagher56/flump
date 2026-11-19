import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TBody, Td, THead, Th } from "../primitives/Table";
import { useTableSort } from "./useTableSort";

interface Row {
  name: string;
  amount: number | null;
  date: string;
}

const ROWS: Row[] = [
  { name: "item 10", amount: 300, date: "2026-05-01" },
  { name: "Item 2", amount: null, date: "2026-04-06" },
  { name: "apple", amount: 1200, date: "2027-01-31" },
  { name: "Banana", amount: 45.5, date: "2026-12-25" },
];

const columns = {
  name: { value: (r: Row) => r.name },
  amount: { value: (r: Row) => r.amount, firstDirection: "desc" as const },
  date: { value: (r: Row) => new Date(r.date), firstDirection: "desc" as const },
};

const names = (rows: Row[]) => rows.map((r) => r.name);

describe("useTableSort", () => {
  it("sorts again when the set of columns changes", () => {
    // Sorted by "n" ascending: 1, 2. The next render drops "n" and adds "m": the sort key no
    // longer names a column, so the rows return to the order given (2, 1).
    const rows = [{ n: 2 }, { n: 1 }];
    type Cols = Record<string, { value: (r: { n: number }) => number }>;
    const { result, rerender } = renderHook(
      ({ columns }: { columns: Cols }) =>
        useTableSort<{ n: number }, string>({
          rows,
          columns,
          initial: { key: "n", direction: "asc" },
        }),
      { initialProps: { columns: { n: { value: (r) => r.n } } as Cols } },
    );
    expect(result.current.sortedRows.map((r) => r.n)).toEqual([1, 2]);
    rerender({ columns: { m: { value: (r) => -r.n } } });
    expect(result.current.sortedRows.map((r) => r.n)).toEqual([2, 1]);
  });

  it("does not re-sort on a re-render that passes a new columns object", () => {
    const rows = [{ n: 2 }, { n: 1 }];
    let reads = 0;
    const { result, rerender } = renderHook(() =>
      useTableSort({
        rows,
        columns: {
          n: {
            value: (r: { n: number }) => {
              reads += 1;
              return r.n;
            },
          },
        },
        initial: { key: "n", direction: "asc" },
      }),
    );
    expect(result.current.sortedRows.map((r) => r.n)).toEqual([1, 2]);
    const after = reads;
    rerender();
    rerender();
    // Same rows, same sort: no column value read again.
    expect(reads).toBe(after);
  });

  it("keeps the given order when there is no initial sort", () => {
    const { result } = renderHook(() => useTableSort({ rows: ROWS, columns }));
    expect(names(result.current.sortedRows)).toEqual(["item 10", "Item 2", "apple", "Banana"]);
    expect(result.current.sort).toBeNull();
    expect(result.current.getSortProps("name").sortDirection).toBe("none");
  });

  it("sorts text with the en-GB collator: case ignored, numbers in order", () => {
    const { result } = renderHook(() => useTableSort({ rows: ROWS, columns }));
    act(() => result.current.toggleSort("name"));
    // apple, Banana, Item 2, item 10: "2" before "10" because the collator compares numbers.
    expect(names(result.current.sortedRows)).toEqual(["apple", "Banana", "Item 2", "item 10"]);
    expect(result.current.getSortProps("name").sortDirection).toBe("asc");
  });

  it("sorts money numerically and puts Not set last in both directions", () => {
    const { result } = renderHook(() => useTableSort({ rows: ROWS, columns }));
    act(() => result.current.toggleSort("amount"));
    // First click is descending: 1200, 300, 45.5, then the Not set row.
    expect(result.current.sortedRows.map((r) => r.amount)).toEqual([1200, 300, 45.5, null]);
    act(() => result.current.toggleSort("amount"));
    // Ascending: 45.5, 300, 1200, and Not set still last.
    expect(result.current.sortedRows.map((r) => r.amount)).toEqual([45.5, 300, 1200, null]);
  });

  it("puts an invalid date last in both directions", () => {
    const rows = [
      { name: "a", date: "2026-05-01" },
      { name: "bad", date: "not a date" },
      { name: "c", date: "2027-01-31" },
    ];
    const dateColumns = {
      date: {
        value: (r: (typeof rows)[number]) => new Date(r.date),
        firstDirection: "desc" as const,
      },
    };
    const { result } = renderHook(() => useTableSort({ rows, columns: dateColumns }));
    act(() => result.current.toggleSort("date"));
    expect(result.current.sortedRows.map((r) => r.name)).toEqual(["c", "a", "bad"]);
    act(() => result.current.toggleSort("date"));
    expect(result.current.sortedRows.map((r) => r.name)).toEqual(["a", "c", "bad"]);
  });

  it("puts empty and whitespace-only text last in both directions", () => {
    const rows = [{ name: "" }, { name: "Banana" }, { name: "   " }, { name: "apple" }];
    const textColumns = { name: { value: (r: { name: string }) => r.name } };
    const { result } = renderHook(() => useTableSort({ rows, columns: textColumns }));
    act(() => result.current.toggleSort("name"));
    // Ascending: apple, Banana, then the two Not set rows in their given order.
    expect(result.current.sortedRows.map((r) => r.name)).toEqual(["apple", "Banana", "", "   "]);
    act(() => result.current.toggleSort("name"));
    expect(result.current.sortedRows.map((r) => r.name)).toEqual(["Banana", "apple", "", "   "]);
  });

  it("sorts dates by time, newest first on the first click", () => {
    const { result } = renderHook(() => useTableSort({ rows: ROWS, columns }));
    act(() => result.current.toggleSort("date"));
    expect(result.current.sortedRows.map((r) => r.date)).toEqual([
      "2027-01-31",
      "2026-12-25",
      "2026-05-01",
      "2026-04-06",
    ]);
  });

  it("cycles first, reversed, then natural order for a table with no initial sort", () => {
    const { result } = renderHook(() => useTableSort({ rows: ROWS, columns }));
    act(() => result.current.toggleSort("name"));
    expect(result.current.sort).toEqual({ key: "name", direction: "asc" });
    act(() => result.current.toggleSort("name"));
    expect(result.current.sort).toEqual({ key: "name", direction: "desc" });
    act(() => result.current.toggleSort("name"));
    expect(result.current.sort).toBeNull();
    expect(names(result.current.sortedRows)).toEqual(["item 10", "Item 2", "apple", "Banana"]);
  });

  it("only flips direction when the table opens sorted", () => {
    const { result } = renderHook(() =>
      useTableSort({ rows: ROWS, columns, initial: { key: "date", direction: "desc" } }),
    );
    expect(result.current.sortedRows[0]?.date).toBe("2027-01-31");
    act(() => result.current.toggleSort("date"));
    expect(result.current.sort).toEqual({ key: "date", direction: "asc" });
    act(() => result.current.toggleSort("date"));
    expect(result.current.sort).toEqual({ key: "date", direction: "desc" });
  });

  it("keeps tied rows in their given order", () => {
    const tied = [
      { name: "b", amount: 5, date: "" },
      { name: "a", amount: 5, date: "" },
      { name: "c", amount: 1, date: "" },
    ];
    const { result } = renderHook(() =>
      useTableSort({ rows: tied, columns, initial: { key: "amount", direction: "desc" } }),
    );
    expect(names(result.current.sortedRows)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the rows it is given", () => {
    const rows = [...ROWS];
    const { result } = renderHook(() => useTableSort({ rows, columns }));
    act(() => result.current.toggleSort("name"));
    expect(names(rows)).toEqual(["item 10", "Item 2", "apple", "Banana"]);
  });
});

const SortableHarness = () => {
  const { sortedRows, getSortProps } = useTableSort({ rows: ROWS, columns });
  return (
    <Table caption="Records">
      <THead>
        <tr>
          <Th text {...getSortProps("name")}>
            Record
          </Th>
          <Th numeric {...getSortProps("amount")}>
            Amount
          </Th>
        </tr>
      </THead>
      <TBody>
        {sortedRows.map((r) => (
          <tr key={r.name}>
            <Td>{r.name}</Td>
            <Td numeric>{r.amount ?? "Not set"}</Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );
};

describe("useTableSort with Th", () => {
  it("toggles aria-sort through ascending, descending and off", () => {
    render(<SortableHarness />);
    const record = screen.getByRole("columnheader", { name: /Record/ });
    const amount = screen.getByRole("columnheader", { name: /Amount/ });
    expect(record.getAttribute("aria-sort")).toBeNull();
    expect(amount.getAttribute("aria-sort")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    expect(record.getAttribute("aria-sort")).toBe("ascending");
    expect(amount.getAttribute("aria-sort")).toBeNull();
    expect(screen.getAllByRole("row")[1]?.textContent).toContain("apple");

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    expect(record.getAttribute("aria-sort")).toBe("descending");
    expect(screen.getAllByRole("row")[1]?.textContent).toContain("item 10");

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    expect(record.getAttribute("aria-sort")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(amount.getAttribute("aria-sort")).toBe("descending");
    const rows = screen.getAllByRole("row");
    expect(rows[rows.length - 1]?.textContent).toContain("Not set");
  });
});
