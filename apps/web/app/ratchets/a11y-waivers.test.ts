import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

// Storybook a11y gate (E8). Stories run axe with `test: "error"` (set globally in preview.tsx).
// Any other `a11y` override in a story file is a waiver and must:
//  - be rule-scoped: `a11y: { config: { rules: [{ id: "<rule>", enabled: false }] } }`, so new
//    violations of any other rule in that story still fail. `test: "todo"`/`"off"`, `disable`,
//    `context`, `options` and `manual` switch off the whole story and are not allowed (the
//    UNSCOPED baseline is 0 and must stay there);
//  - sit directly under an `// E8 waiver: <rule>[, <rule>]` comment naming exactly the rules it
//    disables;
//  - be counted in BASELINE, which may only go down: when you fix a story, remove its waiver and
//    lower BASELINE. Never raise it.
// `tags: ["!test"]` (skip a story that only fails in a real browser) is treated as an unscoped
// waiver too, with the same adjacent-comment requirement.
const BASELINE = 24;
const UNSCOPED_BASELINE = 0;

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

interface Waiver {
  line: number;
  statement: string;
  commentRules: string[] | null;
  scopedRules: string[] | null;
}

const OK_OVERRIDE = /a11y:\s*\{\s*test:\s*["']error["']\s*\}/;
const COMMENT = /^\s*\/\/ E8 waiver: (\S.*)$/;
const COMMENT_ONLY = /^\s*(\/\/|\*|\/\*)/;
const NON_SCOPING_KEY = /\b(test|disable|context|options|manual)\s*:/;

const depthDelta = (text: string): number => {
  let depth = 0;
  for (const ch of text) {
    if (ch === "{" || ch === "[" || ch === "(") depth += 1;
    else if (ch === "}" || ch === "]" || ch === ")") depth -= 1;
  }
  return depth;
};

/** Every a11y override (anything other than `test: "error"`) and `!test` tag in a story source. */
const findWaivers = (source: string): Waiver[] => {
  const lines = source.split("\n");
  const waivers: Waiver[] = [];
  lines.forEach((text, index) => {
    if (COMMENT_ONLY.test(text)) return;
    const isA11y = /a11y/.test(text) && !OK_OVERRIDE.test(text);
    const isSkip = /tags:\s*\[[^\]]*["']!test["']/.test(text);
    if (!isA11y && !isSkip) return;

    // Gather the statement: from this line until its brackets balance (a11y: { ... } may span lines).
    let statement = text.slice(Math.max(text.search(/a11y|tags/), 0));
    let depth = depthDelta(statement);
    for (let next = index + 1; depth > 0 && next < lines.length; next += 1) {
      statement += `\n${lines[next]}`;
      depth += depthDelta(lines[next] ?? "");
    }

    let prev = index - 1;
    while (prev >= 0 && (lines[prev] ?? "").trim() === "") prev -= 1;
    const comment = prev >= 0 ? COMMENT.exec(lines[prev] ?? "") : null;
    const commentRules = comment?.[1] ? comment[1].split(",").map((rule) => rule.trim()) : null;

    const ids = [...statement.matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1] ?? "");
    const scoped =
      isA11y &&
      /config:\s*\{\s*rules:\s*\[/.test(statement) &&
      ids.length > 0 &&
      (statement.match(/enabled:\s*false/g)?.length ?? 0) === ids.length &&
      !/enabled:\s*true/.test(statement) &&
      !NON_SCOPING_KEY.test(statement.replace(/config:\s*\{\s*rules:\s*\[[\s\S]*\]\s*\}/, ""));
    waivers.push({
      line: index + 1,
      statement,
      commentRules,
      scopedRules: scoped ? ids : null,
    });
  });
  return waivers;
};

const stories = ROOTS.flatMap((root) => walk(root));
const allWaivers = stories.flatMap((file) =>
  findWaivers(fs.readFileSync(file, "utf8")).map((waiver) => ({
    ...waiver,
    where: `${path.relative(path.resolve(__dirname, "../../../.."), file)}:${waiver.line}`,
  })),
);

describe("findWaivers detector", () => {
  const detect = (src: string) => findWaivers(src);
  test("ignores the default test: error", () => {
    expect(detect('parameters: { a11y: { test: "error" } },')).toHaveLength(0);
  });
  test.each([
    'parameters: { a11y: { test: "todo" } },',
    'parameters: { a11y: { test: "off" } },',
    "parameters: { a11y: { disable: true } },",
    'parameters: { a11y: { context: { exclude: ".x" } } },',
    "parameters: { a11y: { options: { runOnly: [] } } },",
    'story.parameters.a11y.test = "off";',
    'tags: ["!test"],',
  ])("flags %s as an unscoped waiver", (src) => {
    const [waiver] = detect(src);
    expect(waiver).toBeDefined();
    expect(waiver?.scopedRules).toBeNull();
  });
  test("a rule-scoped waiver is scoped and reads its comment", () => {
    const [waiver] = detect(
      '// E8 waiver: color-contrast, heading-order\nparameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }, { id: "heading-order", enabled: false }] } } },',
    );
    expect(waiver?.scopedRules).toEqual(["color-contrast", "heading-order"]);
    expect(waiver?.commentRules).toEqual(["color-contrast", "heading-order"]);
  });
  test("a scoped waiver that also sets test: off is not scoped", () => {
    const [waiver] = detect(
      'a11y: { test: "off", config: { rules: [{ id: "color-contrast", enabled: false }] } },',
    );
    expect(waiver?.scopedRules).toBeNull();
  });
  test("a comment further than the line above does not count", () => {
    const [waiver] = detect(
      '// E8 waiver: color-contrast\nfoo: 1,\na11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },',
    );
    expect(waiver?.commentRules).toBeNull();
  });
});

describe("a11y waivers only go down", () => {
  test("waiver count does not exceed the baseline", () => {
    expect(allWaivers.length).toBeLessThanOrEqual(BASELINE);
  });

  test("no unscoped waivers (whole-story test todo/off, disable, context, options, !test)", () => {
    const unscoped = allWaivers.filter((waiver) => waiver.scopedRules === null);
    expect(unscoped.map((waiver) => waiver.where)).toHaveLength(UNSCOPED_BASELINE);
  });

  test("every waiver has an adjacent E8 waiver comment naming exactly its rules", () => {
    const bad = allWaivers
      .filter((waiver) => {
        if (waiver.commentRules === null) return true;
        if (waiver.scopedRules === null) return false;
        return [...waiver.commentRules].sort().join() !== [...waiver.scopedRules].sort().join();
      })
      .map((waiver) => waiver.where);
    expect(bad).toEqual([]);
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
