import fs from "node:fs";
import path from "node:path";

// A button with `title` but no `aria-label` has no reliable accessible name (title is a tooltip,
// not a label). Buttons with real text children are exempt. Files owned by in-flight E8 work are
// allowlisted only if they currently violate; remove entries as they are fixed.
const ALLOWLIST: string[] = [];

const APP_DIR = path.resolve(__dirname, "..");
const BUTTON_TAG = /^(button|FLP\w*Button|\w*IconButton)$/;

const walk = (dir: string, files: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") walk(full, files);
    } else if (full.endsWith(".tsx") && !/\.(test|stories)\.tsx$/.test(full)) {
      files.push(full);
    }
  }
  return files;
};

// Reads one JSX opening tag starting at `start` (which points at "<"), honouring braces and
// quotes so `=>` and `>` inside attribute expressions do not end the tag early.
const readOpeningTag = (src: string, start: number): { attrs: string; end: number } | null => {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote && src[i - 1] !== "\\") quote = null;
    } else if (depth === 0 && (ch === '"' || ch === "'")) {
      quote = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
    } else if (ch === ">" && depth === 0 && src[i - 1] !== "=") {
      return { attrs: src.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
};

const hasTextChild = (src: string, tag: string, from: number): boolean => {
  const close = src.indexOf(`</${tag}>`, from);
  if (close === -1) return false;
  const inner = src
    .slice(from, close)
    .replace(/<[^>]*>/g, "")
    .trim();
  // Any remaining text or `{expression}` child counts as a visible label.
  return inner.length > 0;
};

const TAG_START = /<(button|FLP\w*Button|\w*IconButton)(?=[\s>/])/g;

const findViolations = (file: string): string[] => {
  const src = fs.readFileSync(file, "utf8");
  const found: string[] = [];
  for (const match of src.matchAll(TAG_START)) {
    const start = match.index ?? 0;
    const opening = readOpeningTag(src, start);
    if (!opening) continue;
    const { attrs, end } = opening;
    const unnamed =
      /\stitle=/.test(attrs) && !/\saria-label=/.test(attrs) && !/\saria-labelledby=/.test(attrs);
    const selfClosing = attrs.endsWith("/>");
    if (unnamed && (selfClosing || !hasTextChild(src, match[1], end))) {
      const line = src.slice(0, start).split("\n").length;
      found.push(`${path.relative(APP_DIR, file)}:${line} <${match[1]}>`);
    }
  }
  return found;
};

describe("icon-only button ratchet", () => {
  test("buttons with a title also carry an aria-label", () => {
    const violations = walk(APP_DIR)
      .filter((f) => !ALLOWLIST.includes(path.relative(APP_DIR, f)))
      .flatMap(findViolations);
    expect(violations).toEqual([]);
  });
});
