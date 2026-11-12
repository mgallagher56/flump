import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface PlaceholderPattern {
  id: string;
  regex: RegExp;
}

/**
 * What must not reach a launch build (E24-T1). Case-sensitive on purpose: the project
 * placeholders are all upper case. The pound sign appears literally and as a JS escape
 * because a minifier may rewrite it.
 */
export const PLACEHOLDER_PATTERNS: PlaceholderPattern[] = [
  { id: "PLACEHOLDER", regex: /PLACEHOLDER/ },
  { id: "example.invalid", regex: /example\.invalid/ },
  { id: "£X/£Y price", regex: /£[XY]\b/ },
  { id: "\\u00a3X/\\u00a3Y price", regex: /\\u00a3[XY]\b/i },
  { id: "unowned domain flump.app", regex: /flump\.app/ },
  { id: "unowned domain flump.co.uk", regex: /flump\.co\.uk/ },
];

export interface AllowEntry {
  /** Matched against the scanned file path. */
  file: RegExp;
  /** PlaceholderPattern id. */
  pattern: string;
  /** Why this is a false positive. Required. */
  reason: string;
}

/**
 * Allow-list by file and pattern only, each with a reason. Font binaries are handled by
 * SKIP_FILE instead.
 */
export const ALLOW_LIST: AllowEntry[] = [
  {
    file: /(?:^|\/)build\/(?:client|server)\/stats\.html$/,
    pattern: "PLACEHOLDER",
    reason:
      'Bundle-visualizer report (not app copy) that quotes a dependency\'s `const PLACEHOLDER = "*/**/file.js"` glob constant.',
  },
];

export interface PlaceholderHit {
  file: string;
  pattern: string;
  line: number;
  excerpt: string;
}

export function scanText(
  file: string,
  text: string,
  allow: AllowEntry[] = ALLOW_LIST,
): PlaceholderHit[] {
  const hits: PlaceholderHit[] = [];
  for (const { id, regex } of PLACEHOLDER_PATTERNS) {
    if (allow.some((a) => a.pattern === id && a.file.test(file))) continue;
    const m = regex.exec(text);
    if (!m) continue;
    const line = text.slice(0, m.index).split("\n").length;
    const start = Math.max(0, m.index - 30);
    hits.push({
      file,
      pattern: id,
      line,
      excerpt: text
        .slice(start, m.index + m[0].length + 30)
        .replace(/\s+/g, " ")
        .trim(),
    });
  }
  return hits;
}

/**
 * Source maps, plus binary assets: a font or image can contain "£Y" by chance (the Inter
 * woff2 does), and binaries cannot carry copy.
 */
const SKIP_FILE = /\.(?:map|woff2?|ttf|otf|eot|png|jpe?g|gif|webp|avif|ico|mp4|webm|pdf)$/i;

export function collectBuildFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (!SKIP_FILE.test(name)) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

/** Scans every non-.map file under each directory. Throws if a directory is missing. */
export function scanDirectories(
  dirs: string[],
  allow: AllowEntry[] = ALLOW_LIST,
): PlaceholderHit[] {
  const hits: PlaceholderHit[] = [];
  for (const dir of dirs) {
    for (const file of collectBuildFiles(dir)) {
      const rel = relative(process.cwd(), file).split("\\").join("/");
      hits.push(...scanText(rel, readFileSync(file, "utf8"), allow));
    }
  }
  return hits;
}
