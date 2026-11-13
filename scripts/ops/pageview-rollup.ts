/**
 * Daily page counts per route key from exported Railway log lines on stdin (E24-T9).
 * Usage: railway logs ... | bun scripts/ops/pageview-rollup.ts
 * Expects plain `railway logs` output (one raw line per log entry), not `--json`.
 * Non-pageview lines and malformed JSON are ignored. Output: one `day<TAB>key<TAB>count` per line.
 */
const KEY = /^(\/[a-z0-9-]+(\/[a-z0-9-]+)*|\/|other)$/;
const PAGEVIEW = /\{"type":"pageview".*\}/;

export function rollup(lines: Iterable<string>): Map<string, Map<string, number>> {
  const days = new Map<string, Map<string, number>>();
  for (const line of lines) {
    const match = PAGEVIEW.exec(line);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[0]) as { key?: unknown; day?: unknown };
      if (typeof parsed.key !== "string" || typeof parsed.day !== "string") continue;
      if (parsed.key.length > 100 || !KEY.test(parsed.key)) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.day)) continue;
      const keys = days.get(parsed.day) ?? new Map<string, number>();
      keys.set(parsed.key, (keys.get(parsed.key) ?? 0) + 1);
      days.set(parsed.day, keys);
    } catch {
      // ignore a malformed line
    }
  }
  return days;
}

export function render(days: Map<string, Map<string, number>>): string {
  const out: string[] = [];
  for (const day of [...days.keys()].sort()) {
    const keys = days.get(day) as Map<string, number>;
    for (const key of [...keys.keys()].sort()) out.push(`${day}\t${key}\t${keys.get(key)}`);
  }
  return out.join("\n");
}

if (import.meta.main) {
  const text = await Bun.stdin.text();
  const output = render(rollup(text.split("\n")));
  if (output) console.log(output);
  else if (text.trim()) {
    console.error(
      "pageview-rollup: input was not empty but no pageview lines matched. Expecting plain `railway logs` output, not --json.",
    );
  }
}
