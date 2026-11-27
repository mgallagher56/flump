/**
 * The marketing page-weight ratchet (ROLLOUT-PLAN section 2, UX-GUIDELINES MK12). Runs after the
 * marketing build and measures the home page as the browser loads it, gzipped:
 *
 * - first-load script: the module entry and its modulepreloads in index.html;
 * - first-load CSS: the stylesheets index.html links;
 * - lazy script: every other JavaScript chunk, loaded by a dynamic import after first paint. The
 *   site has no route splitting today, so every lazy chunk counts against the home page: an upper
 *   bound, which stays honest until a page other than home gains a lazy chunk.
 *
 * Each measure must stay at or under its baseline (main before the new design, F4) plus the plan's
 * budget for the new blocks. Raising a baseline or a budget is a guard change (AGENTS.md section
 * 15) and is a hand edit to the baseline file; `--write-baseline` only ever lowers a baseline.
 *
 *   bun scripts/check-marketing-weight.ts apps/marketing/dist/client [--write-baseline]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

export const MEASURES = ["firstLoadJsGzip", "cssGzip", "lazyJsGzip"] as const;
export type Measure = (typeof MEASURES)[number];
export type Weights = Record<Measure, number>;

export interface WeightBaseline {
  readonly baseline: Weights;
  readonly budget: Weights;
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

/** Measures a client build directory. Throws when index.html loads no script, so a read of the wrong folder cannot pass. */
export function measureClientBuild(dir: string): Weights {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const { scripts, styles } = firstLoadAssets(html);
  if (scripts.length === 0) throw new Error(`${dir}/index.html loads no script`);
  for (const rel of [...scripts, ...styles]) {
    if (!existsSync(join(dir, rel)))
      throw new Error(`${dir}/index.html loads a missing file: ${rel}`);
  }
  const first = new Set(scripts);
  const sum = (files: string[]) => files.reduce((total, rel) => total + gzipSize(dir, rel), 0);
  return {
    firstLoadJsGzip: sum(scripts),
    cssGzip: sum(styles),
    lazyJsGzip: sum(allJs(dir).filter((rel) => !first.has(rel))),
  };
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
  const file = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as WeightBaseline &
    Record<string, unknown>;
  const measured = measureClientBuild(resolve(dir));
  const rows = compareWeights(measured, file);
  for (const row of rows) {
    const extra = row.measured - file.baseline[row.measure];
    console.log(
      `${row.ok ? "ok  " : "FAIL"} ${LABELS[row.measure]}: ${kb(row.measured)} gzip (baseline ${kb(file.baseline[row.measure])}, ${extra >= 0 ? "+" : ""}${kb(extra)} of the ${kb(file.budget[row.measure])} budget; ceiling ${kb(row.ceiling)})`,
    );
  }
  if (process.argv.includes("--write-baseline")) {
    const baseline = loweredBaseline(measured, file.baseline);
    writeFileSync(BASELINE_FILE, `${JSON.stringify({ ...file, baseline }, null, 2)}\n`);
    console.log(
      "Baselines lowered where the build is lighter. Raising one is a hand edit and a guard change.",
    );
  }
  if (rows.some((r) => !r.ok)) {
    console.error(
      "FAIL the marketing home page is over its weight budget (ROLLOUT-PLAN section 2, UX-GUIDELINES MK12). Make it lighter, load it after first paint, or get sign-off to raise the budget in scripts/marketing-weight-baseline.json (AGENTS.md section 15)",
    );
    process.exit(1);
  }
}
