import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Advice and guarantee copy guard (E19 A2). Flump gives guidance on figures the user enters. It
 * does not promise returns and does not speak for the FCA. A match here means wording that
 * implies a guaranteed outcome or FCA status has come back into user-facing source.
 * Identifier-style schema keys such as `guaranteedInterestSavedGbp` are not matched (no word
 * boundary) and are tracked by E17.
 */
const BANNED: Array<[RegExp, string]> = [
  [/\bguarantee[ds]?\b/i, "promises an outcome"],
  [/\bFCA\b/, "refers to the FCA"],
];

const appRoot = resolve(__dirname, "..");
const SCAN_DIRS = [
  join(appRoot, "app"),
  join(appRoot, "..", "marketing", "src"),
  join(appRoot, "..", "..", "packages", "mcp", "src"),
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : files(p);
    return /\.tsx?$/.test(p) && !/\.(test|stories)\.tsx?$/.test(p) ? [p] : [];
  });
}

const sources = SCAN_DIRS.flatMap(files).map((f) => [f, readFileSync(f, "utf8")] as const);

describe("advice and guarantee copy guard", () => {
  it("scans web, marketing and mcp sources", () => {
    expect(sources.length).toBeGreaterThan(100);
  });

  it.each(BANNED)("source never matches %s (%s)", (pattern) => {
    const hits = sources
      .filter(([, text]) => pattern.test(text))
      .map(([f]) => f.replace(resolve(appRoot, "..", ".."), ""));
    expect(hits, `${pattern} found`).toEqual([]);
  });
});
