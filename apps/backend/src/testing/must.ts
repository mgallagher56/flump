/**
 * Test-side narrowing helpers for `noUncheckedIndexedAccess`. They throw a
 * readable error instead of letting a test continue with `undefined`.
 */
export function must<T>(value: T | null | undefined, label = "value"): T {
  if (value === undefined || value === null) {
    throw new Error(`Expected ${label} to be defined`);
  }
  return value;
}

/** The element at `index` (negative counts from the end); throws when absent. */
export function at<T>(items: readonly T[], index: number): T {
  return must(items.at(index), `element at index ${index}`);
}
