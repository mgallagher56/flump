/**
 * Dark mode without JavaScript (D30).
 *
 * The theme script in `<head>` sets `class="dark"` and `data-theme` on `<html>` from the stored
 * choice or the system setting. With JavaScript off it never runs, so the page used to stay light
 * whatever the system said. `systemDark` covers that case: under
 * `@media (prefers-color-scheme: dark)` it applies the dark values to a root that has not been
 * set to light. When the script has run, `data-theme` is always set, so the two never disagree:
 * an explicit light choice sets `data-theme="light"` and switches `systemDark` off.
 */

/** The JS-off dark condition. Declared in the preset and in each app's Panda config. */
export const colorSchemeConditions = {
  dark: ".dark &, [data-theme='dark'] &",
  systemDark: {
    "@media (prefers-color-scheme: dark)": { ":root:not([data-theme='light']) &": "@slot" },
  },
} as const;

type TokenTree = { [key: string]: unknown };

const isRecord = (value: unknown): value is TokenTree =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Copies every `_dark` value in a semantic-token tree to `_systemDark`, so a token that changes
 * in dark mode also changes when the system is dark and no theme has been set. The input is not
 * changed; a branch with no `_dark` value anywhere in it is returned as the same object.
 */
export function withSystemDark<T>(tree: T): T {
  if (!isRecord(tree)) return tree;
  let changed = false;
  const out: TokenTree = {};
  for (const [key, node] of Object.entries(tree)) {
    const next =
      key === "value" && isRecord(node) && "_dark" in node
        ? { ...node, _systemDark: node._dark }
        : withSystemDark(node);
    if (next !== node) changed = true;
    out[key] = next;
  }
  return (changed ? out : tree) as T;
}
