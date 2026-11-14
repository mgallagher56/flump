import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ADVICE_PATTERNS, findAdviceHits } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";

/**
 * Claims regression guard (E7 T14, marketing only). Each phrase maps to a row in
 * docs/audit/plans/E7-claims-design.md. A match means a removed claim has come back.
 */
const BANNED: Array<[RegExp, string]> = [
  [/TLS 1\.3/, "S3/S5/H1"],
  [/HSTS preload/i, "S5"],
  [/permanent erasure/i, "S7"],
  [/1 business day/i, "S9"],
  [/14-day/, "P8"],
  [/npx @flump\/mcp/, "A1"],
  [/mcp\.flump\.co\.uk/, "A2"],
  [/oauth-protected-resource/, "A2"],
  [
    /FCA-regulated|regulated by the Financial Conduct Authority|AISP regulations|\bAISP\b|\bPISP\b/i,
    "S1/S4/H1/H4",
  ],
  [/£9\.99|£7\.99/, "P3"],
  [/Registered in England/, "H10"],
  [/Strict PII anonymisation/i, "A4"],
  [/We never sell/i, "B"],
  [/Zero ads/i, "B"],
  [/not authorised by the Financial Conduct/i, "B"],
  [/encrypted at rest/i, "A"],
  [/256-bit/, "A"],
  [/\bFCA\b/, "B"],
  [/hallucinat/i, "E"],
  [/\bnpx\b/, "E"],
  [
    /escapedTaxTrap|optimalSacrifice|reclaim your|tax trap escape/i,
    "E29-T4 (R2 advice-shaped copy)",
  ],
  [/No credit card/i, "E"],
  [
    /safe harbou?r|we will not (take|pursue) legal/i,
    "E20 Q13 (no legal promise in disclosure copy)",
  ],
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(p) && !/\.(test|stories)\.tsx?$/.test(p) ? [p] : [];
  });
}

describe("claims guard", () => {
  const sources = files(join(__dirname)).map((f) => [f, readFileSync(f, "utf8")] as const);
  it.each(BANNED)("source contains no %s (register row %s)", (pattern, row) => {
    const hits = sources.filter(([, text]) => pattern.test(text)).map(([f]) => f);
    expect(hits, `Banned phrase ${pattern} (E7 register ${row}) found`).toEqual([]);
  });
});

/**
 * Public calculator pages (E16 PR 11): the tool page, the index and the shared catalogue and
 * guides they read carry no hooks or feature claims the calculators do not back.
 */
describe("public calculator copy guard (E16 PR 11)", () => {
  const banned = /ENGINE|Mathematically|guaranteed|\bsyncs\b|\bmonitors\b|tax trap/i;
  const toolSources = [
    join(__dirname, "pages", "ToolPage", "ToolPage.tsx"),
    join(__dirname, "pages", "ToolsIndexPage", "ToolsIndexPage.tsx"),
    ...files(join(__dirname, "..", "..", "..", "packages", "ui", "src", "tools")),
  ].map((f) => [f, readFileSync(f, "utf8")] as const);

  it("has no hook or unsupported claim", () => {
    expect(toolSources.length).toBeGreaterThanOrEqual(5);
    const hits = toolSources.filter(([, text]) => banned.test(text)).map(([f]) => f);
    expect(hits).toEqual([]);
  });

  it("uses no react-icons and no dollar icon on the tool pages", () => {
    for (const [file, text] of toolSources.slice(0, 2)) {
      expect(text, file).not.toMatch(/react-icons|FiDollarSign|DollarSign/);
    }
  });
});

/**
 * Sign-up CTA guard (E24-T3). The web app sign-up path appears only in utils/site.ts, so no CTA
 * can link to a sign-up that the invite-only beta refuses.
 */
describe("sign-up CTA guard", () => {
  it("keeps the /signup path inside utils/site.ts", () => {
    const hits = files(join(__dirname))
      .filter((f) => !f.endsWith(join("utils", "site.ts")))
      .filter((f) => /\/sign-?up\b/i.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(__dirname.length + 1));
    expect(hits).toEqual([]);
  });
});

describe("contact page guard (E7 S9)", () => {
  const text = readFileSync(join(__dirname, "pages/ContactPage/ContactPage.tsx"), "utf8");
  it("makes no response-time promise", () => {
    expect(text).not.toMatch(
      /business days?|within \d+|24 hours|48 hours|same day|quickly|promptly/i,
    );
  });
});

/**
 * Advice-language ratchet (E29-T3). Rows map to advice boundary rule ids (R1 to R8,
 * docs/compliance/advice-boundary-policy.md) instead of E7 register rows. A new hit fails, and so
 * does a stale entry below, so the list only shrinks. Rewrites are E29-T4.
 */
const ADVICE_ALLOWLIST: Array<{ file: string; patternId: string; owner: string }> = [];

describe("advice-language guard", () => {
  const found = new Set<string>();
  for (const [f, text] of files(join(__dirname)).map(
    (p) => [p, readFileSync(p, "utf8")] as const,
  )) {
    const rel = f.slice(__dirname.length + 1);
    for (const hit of findAdviceHits(text)) found.add(`${rel}::${hit.id}`);
  }
  const allowed = new Set(ADVICE_ALLOWLIST.map((e) => `${e.file}::${e.patternId}`));

  it("uses the shared lexicon", () => {
    expect(ADVICE_PATTERNS.length).toBeGreaterThan(0);
  });

  it("has no advice wording outside the allow-list", () => {
    expect([...found].filter((k) => !allowed.has(k))).toEqual([]);
  });

  it("has no stale allow-list entries", () => {
    expect([...allowed].filter((k) => !found.has(k))).toEqual([]);
  });
});
