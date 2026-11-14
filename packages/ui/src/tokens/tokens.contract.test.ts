// @vitest-environment node
/**
 * Contract test (E12 T1.16b): the native theme generated in `@flump/tokens` agrees with what Panda
 * actually ships for the web. Panda writes its resolved design system with `panda codegen --spec`;
 * this test runs that into a scratch directory (never touching ./styled-system) and compares.
 *
 * Covered: every semantic colour path, both themes; spacing, radii, sizes and font sizes after unit
 * conversion; elevation shadows; durations, easings, z-index and breakpoints; text style names.
 * Not covered by the spec: text style values (the spec lists their names only) and the dark value
 * of shadows that embed a semantic colour (`shadows.focus`): the spec flattens the reference with
 * its light value, while the CSS keeps `var(--colors-...)` and follows the theme. Both are covered
 * by the generator's own tests in packages/tokens.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import * as native from "@flump/tokens/native";
import { beforeAll, describe, expect, it } from "vitest";

interface SpecToken {
  category: string;
  source: number;
}
interface SpecValue {
  token: string;
  value: string;
  condition?: string;
  refs?: string[];
}
interface Spec {
  tokens: Record<string, SpecToken>;
  values: SpecValue[];
  textStyles: Record<string, unknown>;
}

const UI_ROOT = path.resolve(__dirname, "../..");
const SCRATCH = "node_modules/.cache/flump-token-contract";
const SEMANTIC_COLOR_ROOTS = new Set(["border", "chart", "primary", "status", "surface", "text"]);
const PRIMITIVE_SHADOWS = new Set(["cardLight", "cardHoverLight", "floatingLight"]);
const LEGACY_SHADOWS = new Set(["cardHover", "floating"]);

let spec: Spec;
let flumpSource: number;

beforeAll(() => {
  mkdirSync(path.join(UI_ROOT, SCRATCH), { recursive: true });
  execFileSync(
    path.join(UI_ROOT, "node_modules/.bin/panda"),
    [
      "codegen",
      `--outdir=${SCRATCH}/styled-system`,
      `--spec=${SCRATCH}/spec.json`,
      "--log-level=error",
      "--no-color",
    ],
    { cwd: UI_ROOT, stdio: "pipe" },
  );
  spec = JSON.parse(readFileSync(path.join(UI_ROOT, SCRATCH, "spec.json"), "utf8"));
  // The Flump preset's index in the spec's sources: the tokens it, and not Panda, defines.
  flumpSource = spec.tokens["colors.surface.canvas"]?.source ?? -1;
}, 120_000);

/** Keys (without the category prefix) of the tokens our preset defines in a category. */
function flumpKeys(category: string): string[] {
  return Object.entries(spec.tokens)
    .filter(([, t]) => t.category === category && t.source === flumpSource)
    .map(([k]) => k.slice(category.length + 1));
}

/** Light (unconditioned) and dark values of a token. Dark falls back to light when not themed. */
function specValues(token: string): { light: string[]; dark: string } {
  // Token names are public design data in a test, not a secret: a timing-safe compare is not needed.
  // nosemgrep: ajinabraham.njsscan.crypto.timing_attack_node.node_timing_attack
  const rows = spec.values.filter((v) => v.token === token);
  const light = rows.filter((v) => !v.condition).map((v) => v.value);
  const dark = rows.find((v) => v.condition === "_dark")?.value ?? light.at(-1) ?? "";
  return { light, dark };
}

const px = (value: string): number => {
  const m = /^(-?[\d.]+)(px|rem)$/.exec(value);
  if (!m) throw new Error(`Not a px or rem length: ${value}`);
  return m[2] === "rem" ? Number(m[1]) * 16 : Number(m[1]);
};

const sortedKeys = (o: object): string[] => Object.keys(o).sort();

describe("Panda spec and the native theme agree", () => {
  it("finds the Flump preset in the spec", () => {
    expect(flumpSource).toBeGreaterThanOrEqual(0);
  });

  it("have the same semantic colour paths", () => {
    const fromSpec = flumpKeys("colors").filter((k) =>
      SEMANTIC_COLOR_ROOTS.has(k.split(".")[0] ?? ""),
    );
    expect(fromSpec.sort()).toEqual(sortedKeys(native.light.colors));
  });

  it("resolve every semantic colour to the same value in light and dark", () => {
    const mismatches: string[] = [];
    for (const key of Object.keys(native.light.colors) as native.ColorKey[]) {
      const { light, dark } = specValues(`colors.${key}`);
      if (!light.length || light.some((v) => v !== native.light.colors[key])) {
        mismatches.push(`${key} light`);
      }
      if (dark !== native.dark.colors[key]) mismatches.push(`${key} dark`);
    }
    expect(mismatches).toEqual([]);
  });

  it.each([
    ["spacing", native.spacing, (k: string) => !k.startsWith("-")],
    ["radii", native.radii, () => true],
    ["sizes", native.sizes, (k: string) => !k.split(".").includes("compact")],
    ["fontSizes", native.fontSizes, () => true],
  ] as const)("agree on %s after unit conversion", (category, values, keep) => {
    expect(flumpKeys(category).filter(keep).sort()).toEqual(sortedKeys(values));
    for (const [key, n] of Object.entries(values)) {
      for (const v of specValues(`${category}.${key}`).light) expect(px(v), key).toBe(n);
    }
  });

  it("agree on elevation shadows (dark only where no semantic colour is embedded)", () => {
    const keys = sortedKeys(native.light.shadows) as native.ShadowKey[];
    // `xs` overrides a preset-panda shadow, so the spec credits it to Panda: compare both ways
    // as subsets instead of by source.
    for (const k of flumpKeys("shadows")) {
      if (!PRIMITIVE_SHADOWS.has(k) && !LEGACY_SHADOWS.has(k)) expect(keys).toContain(k);
    }
    for (const key of keys) {
      expect(spec.tokens).toHaveProperty([`shadows.${key}`]);
      const rows = spec.values.filter((v) => v.token === `shadows.${key}`);
      const { light, dark } = specValues(`shadows.${key}`);
      // The semantic value is declared after preset-panda's, so the last one wins in the CSS.
      expect(light.at(-1), key).toBe(native.light.shadows[key]);
      const embedsColour = rows.some((r) => r.refs?.some((ref) => ref.startsWith("colors.")));
      if (!embedsColour) expect(dark, key).toBe(native.dark.shadows[key]);
    }
  });

  it("agree on motion, stacking and breakpoints", () => {
    expect(flumpKeys("durations").sort()).toEqual(sortedKeys(native.durations));
    for (const [k, ms] of Object.entries(native.durations)) {
      expect(specValues(`durations.${k}`).light).toEqual([`${ms}ms`]);
    }
    expect(flumpKeys("easings").sort()).toEqual(sortedKeys(native.easings));
    for (const [k, b] of Object.entries(native.easings)) {
      expect(specValues(`easings.${k}`).light).toEqual([`cubic-bezier(${b.join(", ")})`]);
    }
    expect(flumpKeys("zIndex").sort()).toEqual(sortedKeys(native.zIndex));
    for (const [k, z] of Object.entries(native.zIndex)) {
      expect(specValues(`zIndex.${k}`).light).toEqual([String(z)]);
    }
    const { nav, ...steps } = native.breakpoints;
    for (const [k, n] of Object.entries(steps)) {
      expect(specValues(`breakpoints.${k}`).light.map(px), k).toEqual([n]);
    }
    expect(nav).toBe(steps.md);
  });

  it("know the same text style names", () => {
    for (const key of Object.keys(native.textStyles)) expect(spec.textStyles).toHaveProperty([key]);
  });
});
