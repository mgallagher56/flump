/**
 * The key `<ScrollRestoration>` saves a scroll position under. React Router gives every entry made
 * by a full page load or a native `#` jump (the skip link) the same key, "default", so those are
 * keyed by their URL instead: one page's saved offset never opens another page, and a saved offset
 * never overrides an anchor.
 */
export function scrollRestorationKey(location: {
  key: string;
  pathname: string;
  search: string;
  hash: string;
}): string {
  return location.key === "default"
    ? `default:${location.pathname}${location.search}${location.hash}`
    : location.key;
}
