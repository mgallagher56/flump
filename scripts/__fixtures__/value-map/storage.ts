// Fixture browser code for scripts/check-value-map.test.ts. Read as text, never imported.
// A key in a comment is not a key: "flump_commented_out".
const BASELINE_KEY = "flump_fixture_baseline";
const SEEN_PREFIX = "flump.fixture-seen.";

export function save(value: string, panel: string): void {
  window.localStorage.setItem(BASELINE_KEY, value);
  window.sessionStorage.setItem(SEEN_PREFIX + panel, "1");
}
