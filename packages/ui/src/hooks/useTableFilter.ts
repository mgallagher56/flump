import { useCallback, useMemo, useState } from "react";

/** The filter value that matches every row. */
export const TABLE_FILTER_ALL = "all";

export interface UseTableFilterOptions<T, F extends string> {
  rows: readonly T[];
  /**
   * The text a search matches against for each row (names, descriptions, categories). Leave it
   * out when the table has no search. Matching ignores case and surrounding spaces.
   */
  searchText?: (row: T) => string | readonly string[];
  /**
   * Category filters, by name: each returns the row's category value. A filter set to
   * `TABLE_FILTER_ALL` ("all") matches every row.
   */
  filters?: Record<F, (row: T) => string>;
}

export interface UseTableFilterResult<T, F extends string> {
  /** The rows that match the search and every filter, in their given order. */
  filteredRows: T[];
  query: string;
  setQuery: (query: string) => void;
  /** Each filter's current value ("all" until chosen). */
  filterValues: Record<F, string>;
  setFilter: (name: F, value: string) => void;
  /** True while a search or any filter narrows the rows. */
  isFiltered: boolean;
  /** Clear the search and set every filter back to "all". */
  reset: () => void;
}

const allValues = <F extends string>(filters: Record<F, unknown> | undefined) =>
  Object.fromEntries(Object.keys(filters ?? {}).map((k) => [k, TABLE_FILTER_ALL])) as Record<
    F,
    string
  >;

/**
 * Filter table rows by a text search and by category. Pairs with `TableToolbar` (the search field)
 * and `TableFilterSelect` (one select per category), which are always shown above the table.
 */
export function useTableFilter<T, F extends string = never>({
  rows,
  searchText,
  filters,
}: UseTableFilterOptions<T, F>): UseTableFilterResult<T, F> {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<F, string>>(() => allValues(filters));

  const setFilter = useCallback((name: F, value: string) => {
    setFilterValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setFilterValues(allValues(filters));
  }, [filters]);

  const needle = query.trim().toLocaleLowerCase("en-GB");
  const activeFilters = (Object.keys(filters ?? {}) as F[]).filter(
    (name) => (filterValues[name] ?? TABLE_FILTER_ALL) !== TABLE_FILTER_ALL,
  );
  const isFiltered = needle.length > 0 || activeFilters.length > 0;

  const filteredRows = useMemo(() => {
    const active = (Object.keys(filters ?? {}) as F[]).filter(
      (name) => (filterValues[name] ?? TABLE_FILTER_ALL) !== TABLE_FILTER_ALL,
    );
    return rows.filter((row) => {
      if (needle && searchText) {
        const text = searchText(row);
        const haystack = typeof text === "string" ? [text] : text;
        if (!haystack.some((t) => t.toLocaleLowerCase("en-GB").includes(needle))) return false;
      }
      return active.every((name) => filters?.[name]?.(row) === filterValues[name]);
    });
  }, [rows, needle, searchText, filters, filterValues]);

  return { filteredRows, query, setQuery, filterValues, setFilter, isFiltered, reset };
}
