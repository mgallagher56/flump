import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  colorKeys,
  compareKeys,
  flatten,
  renderNativeTokens,
  resolve,
  toBezier,
  toNumber,
  toSize,
} from "../scripts/native-theme.js";
import {
  BOTH,
  KNOWN_FAILURES,
  PASSING_PAIRS,
  pairContrast,
  pairLabel,
  type Theme,
} from "./contrast.js";
import { colors, semanticTokens, textStyles } from "./index.js";
import * as native from "./native.generated.js";

const committed = readFileSync(new URL("./native.generated.ts", import.meta.url), "utf8");
const themes = { light: native.light, dark: native.dark };

describe("native.generated.ts", () => {
  it("is in step with the authored tokens (regenerating gives the committed file byte for byte)", () => {
    // Fails when a token changes without `bun run --cwd packages/tokens generate:tokens`.
    expect(renderNativeTokens()).toBe(committed);
  });

  it("has no imports and says it is generated", () => {
    expect(committed).not.toMatch(/^\s*import\s/m);
    expect(committed).not.toMatch(/\brequire\(/);
    expect(committed.split("\n")[1]).toContain("generated, do not edit");
  });

  it("light and dark have identical key sets", () => {
    expect(Object.keys(native.dark.colors)).toEqual(Object.keys(native.light.colors));
    expect(Object.keys(native.dark.shadows)).toEqual(Object.keys(native.light.shadows));
  });

  it("has every semantic colour path, with Panda's DEFAULT folding", () => {
    expect(Object.keys(native.light.colors)).toEqual(colorKeys);
    expect(colorKeys).toEqual([...flatten(semanticTokens.colors).keys()].sort(compareKeys));
    for (const key of ["border", "primary", "surface", "surface.canvas", "chart.band"]) {
      expect(native.light.colors).toHaveProperty(key);
    }
    expect(colorKeys.some((k) => k.includes("DEFAULT"))).toBe(false);
  });

  it("resolves every reference to a concrete hex or rgba value", () => {
    for (const theme of Object.values(themes)) {
      for (const [key, value] of Object.entries(theme.colors)) {
        expect(value, key).toMatch(/^(#[0-9a-f]{6}|rgba\(\d+, \d+, \d+, [\d.]+\))$/i);
      }
      for (const value of Object.values(theme.shadows)) expect(value).not.toContain("{");
    }
  });

  it("keeps the authored values, alpha included", () => {
    expect(native.light.colors["surface.canvas"]).toBe(colors.sand[50].value);
    expect(native.dark.colors["surface.canvas"]).toBe(colors.dark.canvas.value);
    expect(native.light.colors["chart.band"]).toBe("rgba(15, 107, 94, 0.14)");
    expect(native.dark.colors["surface.scrim"]).toBe("rgba(8, 6, 4, 0.6)");
    expect(native.light.colors.border).toBe(colors.sand[250].value);
  });

  it("resolves semantic colours inside shadows per theme (the focus halo follows the theme)", () => {
    expect(native.light.shadows.focus).toBe("0 0 0 2px #fffdf9, 0 0 0 4px #0f6b5e");
    expect(native.dark.shadows.focus).toBe("0 0 0 2px #272320, 0 0 0 4px #6fd0ba");
    expect(native.light.shadows.card).toContain("rgba(43, 38, 32, 0.08)");
    expect(Object.keys(native.light.shadows)).toEqual(["card", "focus", "overlay", "raised", "xs"]);
  });

  it("emits lengths as unitless numbers, comfortable density only", () => {
    expect(native.spacing["4"]).toBe(16);
    expect(native.spacing["page.gutter.lg"]).toBe(40);
    expect(native.spacing["density.gap"]).toBe(16);
    expect(native.radii.xl).toBe(16);
    expect(native.radii.full).toBe(9999);
    expect(native.sizes.touch).toBe(44);
    expect(native.sizes["density.control.md"]).toBe(40);
    expect(Object.keys(native.sizes).some((k) => k.includes("compact"))).toBe(false);
    expect(native.fontSizes.xs).toBe(12);
    expect(native.fontSizes["6xl"]).toBe(60);
  });

  it("emits a complete object per text style", () => {
    expect(Object.keys(native.textStyles)).toEqual(
      [...flatten(textStyles).keys()].sort(compareKeys),
    );
    expect(native.textStyles["heading.lg"]).toEqual({
      fontFamily: "heading",
      fontSize: 22,
      fontWeight: "600",
      lineHeight: 28.6,
      letterSpacing: -0.22,
    });
    expect(native.textStyles["numeric.hero"]).toMatchObject({
      fontSize: { min: 36, max: 48 },
      lineHeight: { min: 43.2, max: 57.6 },
      fontVariant: ["tabular-nums"],
    });
    for (const [key, style] of Object.entries(native.textStyles)) {
      expect("fontVariant" in style, key).toBe(key.startsWith("numeric."));
    }
  });

  it("emits motion, stacking and breakpoints as numbers", () => {
    expect(native.durations).toEqual({ base: 200, fast: 120, instant: 0, loop: 800, slow: 320 });
    expect(native.easings.standard).toEqual([0.2, 0.6, 0.2, 1]);
    expect(native.zIndex.modal).toBe(50);
    expect(native.zIndex.hide).toBe(-1);
    expect(native.breakpoints).toMatchObject({ md: 768, lg: 1024, nav: 1024 });
  });
});

describe("generator helpers reject what they cannot translate", () => {
  it("lengths", () => {
    expect(toNumber("1.5rem")).toBe(24);
    expect(() => toNumber("2vw")).toThrow(/px or rem/);
    expect(toSize("clamp(2rem, 1.5rem + 2vw, 3rem)")).toEqual({ min: 32, max: 48 });
  });

  it("easings", () => {
    expect(() => toBezier("ease-in")).toThrow(/bezier/);
    expect(() => toBezier("cubic-bezier(0, 1)")).toThrow(/bezier/);
  });

  it("references", () => {
    expect(resolve({ base: "{colors.sand.50}", _dark: "{colors.dark.canvas}" }, "dark")).toBe(
      colors.dark.canvas.value,
    );
    expect(() => resolve("{colors.nope.1}", "light")).toThrow(/Unresolved/);
    expect(() => resolve({ base: 1 }, "light")).toThrow(/Cannot resolve/);
    expect(() => resolve("{colors.sand.50}", "light", ["colors.sand.50"])).toThrow(/Circular/);
  });

  it("natural key order", () => {
    expect(["10", "2", "page", "1"].sort(compareKeys)).toEqual(["1", "2", "10", "page"]);
    expect(["a.b", "a"].sort(compareKeys)).toEqual(["a", "a.b"]);
  });
});

// T1.17: the same contrast matrix as tokens.a11y.test.ts, run on the generated native values.
const nativeColor = (path: string, theme: Theme): string => {
  const key = path.replace(/\.DEFAULT$/, "");
  const value = themes[theme].colors[key as native.ColorKey];
  if (value === undefined) throw new Error(`No native colour for ${path}`);
  return value;
};

describe("contrast matrix on the generated native theme", () => {
  it.each(PASSING_PAIRS)("$fg on $bg >= $min ($role, $themes)", (pair) => {
    for (const theme of pair.themes) {
      expect(pairContrast(pair, theme, nativeColor), pairLabel(pair, theme)).toBeGreaterThanOrEqual(
        pair.min,
      );
    }
  });

  it.each(KNOWN_FAILURES.length ? KNOWN_FAILURES : [null])("known failure %#", (row) => {
    if (!row) return;
    const worst = Math.min(...row.pair.themes.map((t) => pairContrast(row.pair, t, nativeColor)));
    expect(worst, row.finding).toBeLessThan(row.pair.min);
  });

  it("resolves the same pairs on both outputs for both themes", () => {
    expect(PASSING_PAIRS.length).toBeGreaterThan(100);
    expect(() => nativeColor("surface.nope", "light")).toThrow(/No native colour/);
    for (const theme of BOTH) expect(nativeColor("surface.DEFAULT", theme)).toBeTruthy();
  });
});
