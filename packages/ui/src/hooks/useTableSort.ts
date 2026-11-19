import { useCallback, useMemo, useState } from "react";

/** A value a column sorts by. `null`, `undefined` and `NaN` mean "Not set" and always sort last. */
export type SortValue = number | string | Date | null | undefined;

export type TableSortDirection = "asc" | "desc";

export interface TableSortColumn<T> {
  /** The value this column sorts by: a number for money and counts, a Date or ISO string for dates. */
  value: (row: T) => SortValue;
  /**
   * The direction of the first click on this column. Default "asc" (A to Z, smallest first).
   * Money and dates usually start "desc" (largest or newest first).
   */
  firstDirection?: TableSortDirection;
}

export interface TableSortState<K extends string> {
  key: K;
  direction: TableSortDirection;
}

export interface UseTableSortOptions<T, K extends string> {
  rows: readonly T[];
  columns: Record<K, TableSortColumn<T>>;
  /**
   * The sort the table opens with. Leave it out (or pass `null`) to keep the rows in the order
   * given, for schedules whose natural order (year 1, 2, 3) carries meaning. Then a third click on
   * a column clears the sort and the natural order returns.
   */
  initial?: TableSortState<NoInfer<K>> | null;
}

/** What a sortable `Th` takes: spread `getSortProps("amount")` onto it. */
export interface TableSortProps {
  sortDirection: TableSortDirection | "none";
  onSort: () => void;
}

export interface UseTableSortResult<T, K extends string> {
  /** The rows in display order (a new array; the input is never mutated). */
  sortedRows: T[];
  /** The current sort, or `null` when the rows are in their natural order. */
  sort: TableSortState<K> | null;
  /** Activate a column, as a header click does. */
  toggleSort: (key: K) => void;
  /** Props for the column's `Th`: its direction and click handler. */
  getSortProps: (key: K) => TableSortProps;
}

const collator = new Intl.Collator("en-GB", { numeric: true, sensitivity: "base" });

const isNotSet = (v: SortValue): v is null | undefined =>
  v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));

/**
 * Compare two sort values, ascending. Numbers and dates compare numerically, text with the en-GB
 * collator (so "Item 2" sorts before "Item 10" and case is ignored). Not set values are handled
 * by the caller, so they stay last in either direction.
 */
export const compareSortValues = (a: NonNullable<SortValue>, b: NonNullable<SortValue>): number => {
  const an = a instanceof Date ? a.getTime() : a;
  const bn = b instanceof Date ? b.getTime() : b;
  if (typeof an === "number" && typeof bn === "number") return an - bn;
  return collator.compare(String(an), String(bn));
};

/**
 * Sort rows from sortable column headers. Pairs with `Th`'s `sortDirection` and `onSort`, which
 * draw the header button, its icon and `aria-sort`. Not set values sort last whichever way the
 * column runs, and rows that tie keep their given order.
 */
export function useTableSort<T, K extends string>({
  rows,
  columns,
  initial = null,
}: UseTableSortOptions<T, K>): UseTableSortResult<T, K> {
  const [sort, setSort] = useState<TableSortState<K> | null>(initial);
  const naturalOrder = initial === null;

  const toggleSort = useCallback(
    (key: K) => {
      setSort((prev) => {
        const first = columns[key]?.firstDirection ?? "asc";
        if (!prev || prev.key !== key) return { key, direction: first };
        // A table with a natural order goes first, reversed, then back to natural.
        if (naturalOrder && prev.direction !== first) return null;
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      });
    },
    [columns, naturalOrder],
  );

  const sortedRows = useMemo(() => {
    const indexed = rows.map((row, index) => ({ row, index }));
    if (!sort) return indexed.map((r) => r.row);
    const column = columns[sort.key];
    if (!column) return indexed.map((r) => r.row);
    const factor = sort.direction === "asc" ? 1 : -1;
    return indexed
      .map((r) => ({ ...r, value: column.value(r.row) }))
      .sort((a, b) => {
        const aUnset = isNotSet(a.value);
        const bUnset = isNotSet(b.value);
        if (aUnset || bUnset) {
          if (aUnset && bUnset) return a.index - b.index;
          return aUnset ? 1 : -1;
        }
        return (
          compareSortValues(a.value as NonNullable<SortValue>, b.value as NonNullable<SortValue>) *
            factor || a.index - b.index
        );
      })
      .map((r) => r.row);
  }, [rows, columns, sort]);

  const getSortProps = useCallback(
    (key: K): TableSortProps => ({
      sortDirection: sort?.key === key ? sort.direction : "none",
      onSort: () => toggleSort(key),
    }),
    [sort, toggleSort],
  );

  return { sortedRows, sort, toggleSort, getSortProps };
}
