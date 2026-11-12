import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
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
