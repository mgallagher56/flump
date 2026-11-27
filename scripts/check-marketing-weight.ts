/**
 * The marketing page-weight ratchet (ROLLOUT-PLAN section 2, OTHER-PAGES-PLAN section 4,
 * UX-GUIDELINES MK12). Runs after the marketing build and measures every page as the browser loads
 * it, gzipped:
 *
 * - first-load script: the module entry and its modulepreloads in index.html, plus the page's own
 *   chunk and the shared chunks it imports. Each page is its own chunk (M1,
 *   `apps/marketing/src/lazyPages.tsx`); the server preloads the requested page's chunks, read
 *   from Vite's build manifest (`apps/marketing/server/pageChunks.ts`), and so does this check;
 * - first-load CSS: the stylesheets index.html links (one stylesheet for the whole site);
 * - lazy script: what the page may load later by dynamic import (GSAP, three.js), from the same
 *   manifest. Other pages' chunks are never loaded by it, so they do not count. A build with no
 *   manifest counts every chunk index.html does not load, an upper bound.
 *
 * Each page has its own entry in the baseline file: each measure must stay at or under the page's
 * baseline (main before the page's new design) plus its budget for the new blocks. Raising a
 * baseline or a budget is a guard change (AGENTS.md section 15) and is a hand edit to the baseline
 * file; `--write-baseline` only ever lowers a baseline.
 *
 *   bun scripts/check-marketing-weight.ts apps/marketing/dist/client [--write-baseline]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { type BuildManifest, pageFiles, pageLazyFiles } from "../apps/marketing/server/pageChunks";

/** A page's module, the key Vite's build manifest gives its chunk (`pageSource` in `apps/marketing/src/pageSet.ts`). */
export const pageKey = (page: string) => `src/pages/${page}/index.ts`;
const MANIFEST = ".vite/manifest.json";

export const MEASURES = ["firstLoadJsGzip", "cssGzip", "lazyJsGzip"] as const;
export type Measure = (typeof MEASURES)[number];
export type Weights = Record<Measure, number>;

export interface WeightBaseline {
  readonly baseline: Weights;
  readonly budget: Weights;
}

/** The committed file: one baseline and budget per page, by page name (`PageName`). */
export interface WeightFile {
  readonly pages: Readonly<Record<string, WeightBaseline>>;
}

const LABELS: Record<Measure, string> = {
  firstLoadJsGzip: "First-load script",
  cssGzip: "First-load CSS",
  lazyJsGzip: "Lazy script",
};

export const BASELINE_FILE = resolve(import.meta.dir, "marketing-weight-baseline.json");

const attr = (tag: string, name: string) =>
  new RegExp(String.raw`(?:^|\s)${name}\s*=\s*["']([^"']+)["']`).exec(tag)?.[1];

/** The script and stylesheet files index.html loads, as paths relative to the client build. */
export function firstLoadAssets(html: string): { scripts: string[]; styles: string[] } {
  const scripts: string[] = [];
  const styles: string[] = [];
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const src = attr(tag, "src");
    const href = attr(tag, "href");
    const rel = attr(tag, "rel");
    if (tag.startsWith("<script") && src) scripts.push(src);
    else if (rel === "modulepreload" && href) scripts.push(href);
    else if (rel === "stylesheet" && href) styles.push(href);
  }
  const local = (p: string) => !/^[a-z]+:\/\//i.test(p) && !p.startsWith("//");
  const strip = (p: string) => p.replace(/^\//, "").replace(/[?#].*$/, "");
  return { scripts: scripts.filter(local).map(strip), styles: styles.filter(local).map(strip) };
}

function allJs(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...allJs(dir, rel));
    else if (/\.m?js$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const gzipSize = (dir: string, rel: string) => gzipSync(readFileSync(join(dir, rel))).length;

/**
 * Measures one page of a client build directory (the home page unless named). Throws when
 * index.html loads no script, so a read of the wrong folder cannot pass, and when the manifest has
 * no such page.
 */
export function measureClientBuild(dir: string, page = "HomePage"): Weights {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const { scripts, styles } = firstLoadAssets(html);
  if (scripts.length === 0) throw new Error(`${dir}/index.html loads no script`);
  for (const rel of [...scripts, ...styles]) {
    if (!existsSync(join(dir, rel)))
      throw new Error(`${dir}/index.html loads a missing file: ${rel}`);
  }
  const sum = (files: string[]) => files.reduce((total, rel) => total + gzipSize(dir, rel), 0);
  if (existsSync(join(dir, MANIFEST))) {
    const manifest = JSON.parse(readFileSync(join(dir, MANIFEST), "utf8")) as BuildManifest;
    const key = pageKey(page);
    if (!manifest[key]) throw new Error(`${dir}/${MANIFEST} has no ${key}`);
    const own = pageFiles(manifest, key).filter((rel) => /\.m?js$/.test(rel));
    const first = [...new Set([...scripts, ...own])];
    // Everything the page loads later: scripts, and any stylesheet, image or font a lazy chunk brings.
    const lazy = pageLazyFiles(manifest, key);
    return { firstLoadJsGzip: sum(first), cssGzip: sum(styles), lazyJsGzip: sum(lazy) };
  }
  const first = new Set(scripts);
  return {
    firstLoadJsGzip: sum(scripts),
    cssGzip: sum(styles),
    lazyJsGzip: sum(allJs(dir).filter((rel) => !first.has(rel))),
  };
}

/** The script files a page loads at once: index.html's, and the page's own chunks from the manifest. */
export function firstLoadScripts(dir: string, page: string): string[] {
  const { scripts } = firstLoadAssets(readFileSync(join(dir, "index.html"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(dir, MANIFEST), "utf8")) as BuildManifest;
  const key = pageKey(page);
  if (!manifest[key]) throw new Error(`${dir}/${MANIFEST} has no ${key}`);
  const own = pageFiles(manifest, key).filter((rel) => /\.m?js$/.test(rel));
  return [...new Set([...scripts, ...own])];
}

/**
 * Text only the home journey's samples contain (`JourneySample.tsx`): the area pages' set piece.
 * Its chunk must be one home also loads, so after a home visit the area pages' extra weight is
 * already cached (coordinator's condition on the AreaPage budget, 27 Nov 2026).
 */
export const SET_PIECE_MARKER = "Estimated paid off";

/**
 * Whether `page`'s first-load chunks holding `marker` are all chunks `shared` also loads at once.
 * False when no first-load chunk of `page` holds it, so a renamed sample cannot pass unseen.
 */
export function chunksShared(dir: string, page: string, shared: string, marker: string) {
  const holding = firstLoadScripts(dir, page).filter((rel) =>
    readFileSync(join(dir, rel), "utf8").includes(marker),
  );
  const theirs = new Set(firstLoadScripts(dir, shared));
  return { holding, ok: holding.length > 0 && holding.every((rel) => theirs.has(rel)) };
}

export interface WeightRow {
  readonly measure: Measure;
  readonly measured: number;
  readonly ceiling: number;
  readonly ok: boolean;
}

/** Each measure against its ceiling: baseline plus budget. */
export function compareWeights(measured: Weights, file: WeightBaseline): WeightRow[] {
  return MEASURES.map((measure) => {
    const ceiling = file.baseline[measure] + file.budget[measure];
    return { measure, measured: measured[measure], ceiling, ok: measured[measure] <= ceiling };
  });
}

/** The baselines lowered to what was measured where it is lower; never raised. */
export function loweredBaseline(measured: Weights, baseline: Weights): Weights {
  return Object.fromEntries(
    MEASURES.map((m) => [m, Math.min(measured[m], baseline[m])]),
  ) as Weights;
}

const kb = (bytes: number) => `${(bytes / 1000).toFixed(1)} KB`;

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) {
    console.error(
      "Usage: bun scripts/check-marketing-weight.ts <client build dir> [--write-baseline]",
    );
    process.exit(2);
  }
  const file = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as WeightFile &
    Record<string, unknown>;
  const lowered: Record<string, WeightBaseline> = {};
  const over: string[] = [];
  for (const [page, entry] of Object.entries(file.pages)) {
    const measured = measureClientBuild(resolve(dir), page);
    console.log(page);
    for (const row of compareWeights(measured, entry)) {
      const extra = row.measured - entry.baseline[row.measure];
      console.log(
        `  ${row.ok ? "ok  " : "FAIL"} ${LABELS[row.measure]}: ${kb(row.measured)} gzip (baseline ${kb(entry.baseline[row.measure])}, ${extra >= 0 ? "+" : ""}${kb(extra)} of the ${kb(entry.budget[row.measure])} budget; ceiling ${kb(row.ceiling)})`,
      );
      if (!row.ok) over.push(`${page} ${LABELS[row.measure]}`);
    }
    lowered[page] = { ...entry, baseline: loweredBaseline(measured, entry.baseline) };
  }
  const setPiece = chunksShared(resolve(dir), "AreaPage", "HomePage", SET_PIECE_MARKER);
  console.log(
    `${setPiece.ok ? "ok  " : "FAIL"} AreaPage's set piece is in chunks home also loads: ${setPiece.holding.join(", ") || "none found"}`,
  );
  if (!setPiece.ok) over.push("AreaPage set piece not shared with home");
  if (process.argv.includes("--write-baseline")) {
    writeFileSync(BASELINE_FILE, `${JSON.stringify({ ...file, pages: lowered }, null, 2)}\n`);
    console.log(
      "Baselines lowered where the build is lighter. Raising one is a hand edit and a guard change.",
    );
  }
  if (over.length > 0) {
    console.error(
      `FAIL over the weight budget: ${over.join(", ")} (OTHER-PAGES-PLAN section 4, UX-GUIDELINES MK12). Make it lighter, load it after first paint, or get sign-off to raise the budget in scripts/marketing-weight-baseline.json (AGENTS.md section 15)`,
    );
    process.exit(1);
  }
}
