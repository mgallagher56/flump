import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { findAdviceHits } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { ADVICE_ALLOWLIST } from "./advice-allowlist";

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
  [/flump\.app|flump\.co\.uk/i, "names a domain we do not own (E24-T5)"],
  [/message has been received/i, "claims a message was sent when nothing is (E24-T5)"],
];

const appRoot = resolve(__dirname, "..");
const SCAN_DIRS = [
  join(appRoot, "app"),
  join(appRoot, "..", "marketing", "src"),
  join(appRoot, "..", "..", "packages", "mcp", "src"),
];
// The advice ratchet also covers the engine and the UI package, which reach users and MCP.
// E15 owns packages/ui, so the older guarantee and FCA patterns are not widened to it here.
const ADVICE_EXTRA_DIRS = [
  join(appRoot, "..", "..", "packages", "finance-engine", "src"),
  join(appRoot, "..", "..", "packages", "ui", "src"),
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    // `compliance` holds the advice lexicon itself, whose rule text names the banned words.
    if (statSync(p).isDirectory()) {
      return name === "node_modules" || name === "compliance" ? [] : files(p);
    }
    return /\.tsx?$/.test(p) && !/\.(test|stories)\.tsx?$/.test(p) ? [p] : [];
  });
}

const repoRoot = resolve(appRoot, "..", "..");
const read = (dirs: string[]) =>
  dirs.flatMap(files).map((f) => [f, readFileSync(f, "utf8")] as const);
const sources = read(SCAN_DIRS);
const adviceSources = read([...SCAN_DIRS, ...ADVICE_EXTRA_DIRS]);

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

/**
 * Advice-language ratchet (E29-T3). New hits fail; stale allow-list entries fail, so the list
 * only shrinks. Rules R1 to R8: docs/compliance/advice-boundary-policy.md.
 */
describe("advice-language guard", () => {
  const found = new Set<string>();
  for (const [f, text] of adviceSources) {
    const rel = f.replace(`${repoRoot}/`, "");
    // Marketing keeps its own ratchet in claims.test.ts; the allow-list file quotes the wording.
    if (rel.startsWith("apps/marketing/") || rel === "apps/web/app/advice-allowlist.ts") continue;
    for (const hit of findAdviceHits(text)) found.add(`${rel}::${hit.id}`);
  }
  const allowed = new Set(ADVICE_ALLOWLIST.map((e) => `${e.file}::${e.patternId}`));

  it("has no duplicate allow-list entries and a reason and owner on each", () => {
    expect(allowed.size).toBe(ADVICE_ALLOWLIST.length);
    for (const e of ADVICE_ALLOWLIST) {
      expect(e.reason.length, `${e.file} reason`).toBeGreaterThan(0);
      expect(e.owner.length, `${e.file} owner`).toBeGreaterThan(0);
    }
  });

  it("has no advice wording outside the allow-list", () => {
    expect([...found].filter((k) => !allowed.has(k))).toEqual([]);
  });

  it("has no stale allow-list entries (remove the entry once the hit is gone)", () => {
    expect([...allowed].filter((k) => !found.has(k))).toEqual([]);
  });
});
