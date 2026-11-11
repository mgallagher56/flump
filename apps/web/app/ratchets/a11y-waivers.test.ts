import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

// Storybook a11y gate (E8): known axe violations are waived per story with
// `parameters.a11y.test = "todo"` (or `tags: ["!test"]` for play() failures that only show in a
// real browser), each preceded by an `// E8 waiver: <rule>` comment. The count may only go down:
// when you fix a story, remove its waiver and lower BASELINE. Never raise it.
const BASELINE = 40;

const ROOTS = [
  path.resolve(__dirname, "../.."),
  path.resolve(__dirname, "../../../../packages/ui/src"),
  path.resolve(__dirname, "../../../marketing/src"),
];
const WAIVER = /a11y:\s*\{\s*test:\s*["']todo["']\s*\}|tags:\s*\[\s*["']!test["']\s*\]/g;
const COMMENTED_WAIVER = /\/\/ E8 waiver: \S/g;

const walk = (dir: string, files: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === "build" ||
      entry.name === "storybook-static"
    )
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.stories\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files;
};

const stories = ROOTS.flatMap((root) => walk(root));
const count = (re: RegExp): number =>
  stories.reduce(
    (total, file) => total + (fs.readFileSync(file, "utf8").match(re)?.length ?? 0),
    0,
  );

describe("a11y waivers only go down", () => {
  test("waiver count does not exceed the baseline", () => {
    expect(count(WAIVER)).toBeLessThanOrEqual(BASELINE);
  });

  test("every waiver carries an E8 waiver comment", () => {
    expect(count(COMMENTED_WAIVER)).toBeGreaterThanOrEqual(count(WAIVER));
  });

  test("no global a11y waiver in the preview", () => {
    const preview = fs.readFileSync(
      path.resolve(__dirname, "../../.storybook/preview.tsx"),
      "utf8",
    );
    expect(preview).toContain('test: "error"');
    expect(preview).not.toMatch(/test:\s*["'](todo|off)["']/);
  });
});
