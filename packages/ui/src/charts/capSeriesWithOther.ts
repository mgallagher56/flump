export type SeriesItem = { label: string; value: number };

/**
 * Keep the largest `max` items and group the rest into one "Other" item that sums their values.
 * Input order is preserved for the kept items' relative ranking by value (descending, stable on
 * ties: earlier items win). Returns the input unchanged (a copy) when it already fits.
 * With `max` of 6 the result has at most 6 slices including "Other", so "Other" replaces the
 * smallest kept item rather than becoming a 7th slice.
 */
export function capSeriesWithOther<T extends SeriesItem>(
  items: readonly T[],
  max = 6,
  otherLabel = "Other",
): Array<T | SeriesItem> {
  const limit = Math.max(1, Number.isFinite(max) ? Math.trunc(max) : 6);
  if (items.length <= limit) return [...items];
  const ranked = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.value - a.item.value || a.index - b.index);
  const keepCount = limit - 1;
  const kept = ranked.slice(0, keepCount);
  const tail = ranked.slice(keepCount);
  const other: SeriesItem = {
    label: otherLabel,
    value: tail.reduce((sum, { item }) => sum + item.value, 0),
  };
  return [...kept.map(({ item }) => item), other];
}
