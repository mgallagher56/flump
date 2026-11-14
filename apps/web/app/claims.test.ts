import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Claims regression guard (web). Scans the logged-out home, setup and ai-connections
 * components plus route files for removed claims. A match means a removed claim has
 * come back. Legitimate uses elsewhere (for example the FCA Priority Debt Guardrail in
 * the budget dashboard, or tools.$slug.tsx) are deliberately outside the scanned scope.
 */
const BANNED: Array<[RegExp, string]> = [
  [/256-bit/, "A"],
  [/hallucinat/i, "E"],
  [/\bnpx\b/, "E"],
  [/No credit card/i, "E"],
  [/We never sell/i, "B"],
  [/Zero ads/i, "B"],
  [/encrypted at rest/i, "A"],
  [/OAuth 2\.1/, "E"],
];

const FCA_PATTERN = /FCA/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(p) && !/\.(test|stories)\.tsx?$/.test(p) ? [p] : [];
  });
}

const read = (list: string[]) => list.map((f) => [f, readFileSync(f, "utf8")] as const);

const COPY_DIRS = [
  join(__dirname, "features", "signed-out"),
  join(__dirname, "features", "dashboard", "components", "SetupChecklist"),
  join(__dirname, "features", "ai-connections"),
];

const copySources = read(COPY_DIRS.flatMap(files));
// tools.$slug.tsx legitimately references FCA guidance for the tool pages.
const routeSources = read(files(join(__dirname, "routes")).filter((f) => !/tools\.\$slug/.test(f)));
const sources = [...copySources, ...routeSources];

describe("web claims guard", () => {
  it("scans a non-empty set of sources", () => {
    expect(copySources.length).toBeGreaterThan(0);
    expect(routeSources.length).toBeGreaterThan(0);
  });

  it.each(BANNED)("source contains no %s (register row %s)", (pattern, row) => {
    const hits = sources.filter(([, text]) => pattern.test(text)).map(([f]) => f);
    expect(hits, `Banned phrase ${pattern} (E7 register ${row}) found`).toEqual([]);
  });

  it("bank dialogs do not advertise live sync (E7 decision A)", () => {
    const dialogSources = read(files(join(__dirname, "components", "dialogs")));
    const live = /Direct Sync|Direct live|real Open Banking|automatically sync/i;
    const hits = dialogSources.filter(([, text]) => live.test(text)).map(([f]) => f);
    expect(hits, "Live-sync wording found in dialogs").toEqual([]);
  });

  it("home, setup and ai-connections copy makes no FCA claims", () => {
    const hits = copySources.filter(([, text]) => FCA_PATTERN.test(text)).map(([f]) => f);
    expect(hits, "FCA reference found in scoped copy").toEqual([]);
  });
});

/**
 * Public calculator pages (E16 PR 11): the tool pages, the index and the shared catalogue and
 * guides they read carry no hooks or feature claims the calculators do not back.
 */
const TOOL_PAGE_BANNED = /ENGINE|Mathematically|guaranteed|\bsyncs\b|\bmonitors\b|tax trap/i;

describe("public calculator copy guard (E16 PR 11)", () => {
  const toolSources = read([
    join(__dirname, "routes", "tools.$slug.tsx"),
    join(__dirname, "routes", "tools._index.tsx"),
    ...files(join(__dirname, "..", "..", "..", "packages", "ui", "src", "tools")),
  ]);

  it("scans the tool pages and the shared catalogue", () => {
    expect(toolSources.length).toBeGreaterThanOrEqual(5);
  });

  it("has no hook or unsupported claim", () => {
    const hits = toolSources.filter(([, text]) => TOOL_PAGE_BANNED.test(text)).map(([f]) => f);
    expect(hits).toEqual([]);
  });
});
