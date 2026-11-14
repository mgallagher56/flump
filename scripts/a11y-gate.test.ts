import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  type A11yBaseline,
  compareFindings,
  mergeBaseline,
  pruneFindings,
  serializeBaseline,
  totalsByCheck,
} from "../apps/e2e/a11y/baseline";

const repoRoot = resolve(import.meta.dir, "..");

describe("a11y baseline comparison", () => {
  const allowed = { axe: { "color-contrast": 3, region: 1 }, focus: { obscured: 2 } };

  test("passes at the baseline", () => {
    expect(compareFindings("r [p]", allowed, allowed)).toEqual({
      regressions: [],
      improvements: [],
    });
  });

  test("fails on a new rule and on a rising count, naming route, project, check and rule", () => {
    const { regressions } = compareFindings(
      "web-budget [375-dark]",
      { axe: { "color-contrast": 4, region: 1, "button-name": 1 }, focus: { obscured: 2 } },
      allowed,
    );
    expect(regressions).toEqual([
      "web-budget [375-dark] axe: button-name 1, baseline allows 0",
      "web-budget [375-dark] axe: color-contrast 4, baseline allows 3",
    ]);
  });

  test("passes with improvements when counts fall or rules disappear", () => {
    const result = compareFindings("r [p]", { axe: { "color-contrast": 1 } }, allowed);
    expect(result.regressions).toEqual([]);
    expect(result.improvements).toEqual([
      "r [p] axe: color-contrast 3 -> 1",
      "r [p] axe: region 1 -> 0",
      "r [p] focus: obscured 2 -> 0",
    ]);
  });

  test("treats zero counts as absent", () => {
    expect(pruneFindings({ axe: {}, focus: { obscured: 0, "no-skip-link": 1 } })).toEqual({
      focus: { "no-skip-link": 1 },
    });
    expect(compareFindings("r [p]", { focus: { obscured: 0 } }, undefined).regressions).toEqual([]);
  });
});

describe("a11y baseline merge and serialisation", () => {
  const previous: A11yBaseline = {
    generated: false,
    routes: {
      "web-a": { "1280-light": { lang: { "html-lang-not-en-GB": 1 } } },
      "web-gone": { "1280-light": { axe: { region: 1 } } },
    },
  };

  test("replaces what ran, keeps what did not, drops removed routes and clean entries", () => {
    const next = mergeBaseline(
      previous,
      [
        { route: "web-b", project: "375-light", findings: { axe: { "color-contrast": 2 } } },
        { route: "web-a", project: "375-light", findings: { axe: {} } },
      ],
      new Set(["web-a", "web-b"]),
    );
    expect(next).toEqual({
      generated: true,
      routes: {
        "web-a": { "1280-light": { lang: { "html-lang-not-en-GB": 1 } } },
        "web-b": { "375-light": { axe: { "color-contrast": 2 } } },
      },
    });
    expect(totalsByCheck(next)).toEqual({ axe: 2, lang: 1 });
  });

  test("serialises deterministically with sorted keys and a trailing newline", () => {
    const a = serializeBaseline({
      generated: true,
      routes: { z: { p: { axe: { b: 1, a: 2 } } }, a: { p: { focus: { obscured: 1 } } } },
    });
    const b = serializeBaseline({
      routes: { a: { p: { focus: { obscured: 1 } } }, z: { p: { axe: { a: 2, b: 1 } } } },
      generated: true,
    });
    expect(a).toBe(b);
    expect(a.endsWith("}\n")).toBe(true);
    expect(a.indexOf('"a"')).toBeLessThan(a.indexOf('"z"'));
  });

  test("the committed baseline is in canonical form", () => {
    const text = readFileSync(resolve(repoRoot, "apps/e2e/a11y/baseline.json"), "utf8");
    expect(serializeBaseline(JSON.parse(text))).toBe(text);
  });
});

describe("a11y gate wiring", () => {
  test("root and e2e scripts exist", () => {
    const root = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
    expect(root.scripts["test:a11y"]).toBe("bun run --cwd apps/e2e e2e:a11y");
    const e2e = JSON.parse(readFileSync(resolve(repoRoot, "apps/e2e/package.json"), "utf8"));
    expect(e2e.scripts["e2e:a11y"]).toBe("playwright test -c playwright.a11y.config.ts");
    expect(e2e.devDependencies["@axe-core/playwright"]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("the workflow is advisory and pins third-party actions to a commit", () => {
    const yml = readFileSync(resolve(repoRoot, ".github/workflows/a11y-gate.yml"), "utf8");
    expect(yml).toContain("continue-on-error: true");
    expect(yml).toContain("workflow_dispatch:");
    expect(yml).toContain("A11Y_UPDATE_BASELINE");
    for (const [, ref] of yml.matchAll(/uses:\s*([^\s#]+)/g)) {
      if (ref?.startsWith("./")) continue;
      expect(ref).toMatch(/@[0-9a-f]{40}$/);
    }
  });
});
