import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import flumpPreset from "../../panda.preset";
import {
  densitySizes,
  densitySpacing,
  durations,
  easings,
  elevationShadows,
  fontFamilies,
  fonts,
  motionKeyframes,
  semanticTokens,
  sizes,
  textStyles,
  zIndex,
} from "./index";

type Leaf = { path: string; value: Record<string, string> };

/** Flatten a textStyles tree into `display`, `heading.xl`, ... leaves. */
function textStyleLeaves(node: Record<string, any>, trail: string[] = []): Leaf[] {
  return Object.entries(node).flatMap(([key, child]) =>
    "value" in child
      ? [{ path: [...trail, key].join("."), value: child.value as Record<string, string> }]
      : textStyleLeaves(child, [...trail, key]),
  );
}

const leaves = textStyleLeaves(textStyles);
const remOf = (v: string) => Number.parseFloat(v);

describe("E15 textStyles", () => {
  it("defines the full vocabulary", () => {
    expect(leaves.map((l) => l.path).sort()).toEqual(
      [
        "display",
        "heading.xl",
        "heading.lg",
        "heading.md",
        "heading.sm",
        "body.lg",
        "body.md",
        "body.sm",
        "label.md",
        "label.sm",
        "numeric.kpi",
        "numeric.lg",
        "numeric.md",
        "numeric.sm",
      ].sort(),
    );
  });

  it("every numeric style carries tabular-nums", () => {
    const numeric = leaves.filter((l) => l.path.startsWith("numeric."));
    expect(numeric).toHaveLength(4);
    for (const l of numeric) expect(l.value.fontVariantNumeric, l.path).toBe("tabular-nums");
  });

  it("keeps a 12px floor and 1.2 to 1.6 line heights", () => {
    for (const l of leaves) {
      const size = l.value.fontSize;
      if (!size.startsWith("clamp(")) expect(remOf(size), l.path).toBeGreaterThanOrEqual(0.75);
      const lh = Number(l.value.lineHeight);
      expect(lh, l.path).toBeGreaterThanOrEqual(1.2);
      expect(lh, l.path).toBeLessThanOrEqual(1.6);
    }
  });

  it("uses fluid clamp() only on display and heading.xl, and clamp minimums stay >= 12px", () => {
    const fluid = leaves.filter((l) => l.value.fontSize.startsWith("clamp(")).map((l) => l.path);
    expect(fluid.sort()).toEqual(["display", "heading.xl"]);
    for (const l of leaves.filter((x) => fluid.includes(x.path))) {
      expect(remOf(l.value.fontSize.replace("clamp(", ""))).toBeGreaterThanOrEqual(0.75);
    }
  });

  it("headings and display use the heading face, numeric uses the body face", () => {
    for (const l of leaves) {
      const expected =
        l.path === "display" || l.path.startsWith("heading.")
          ? fontFamilies.heading
          : fontFamilies.body;
      expect(l.value.fontFamily, l.path).toBe(expected);
    }
  });
});

describe("E15 font roles come from one place", () => {
  it("fonts.body/heading/numeric and the legacy keys derive from fontFamilies", () => {
    expect(fonts.body.value).toBe(fontFamilies.body);
    expect(fonts.heading.value).toBe(fontFamilies.heading);
    expect(fonts.numeric.value).toBe(fonts.body.value);
    expect(fonts.sans.value).toBe(fontFamilies.body);
    expect(fonts.display.value).toBe(fontFamilies.heading);
    expect(fonts.mono.value).toBe(fontFamilies.mono);
  });
});

describe("E15 elevation", () => {
  it("every elevation shadow, and every semantic shadow, defines base and _dark", () => {
    for (const [key, token] of Object.entries(elevationShadows)) {
      const v = token.value as Record<string, string>;
      expect(v.base, `${key}.base`).toBeTruthy();
      expect(v._dark, `${key}._dark`).toBeTruthy();
    }
    for (const [key, token] of Object.entries(semanticTokens.shadows)) {
      expect((token.value as Record<string, string>)._dark, key).toBeTruthy();
    }
    for (const key of ["xs", "card", "raised", "overlay", "focus"]) {
      expect(elevationShadows).toHaveProperty(key);
    }
  });

  it("keeps the legacy card, cardHover and floating keys", () => {
    for (const key of ["card", "cardHover", "floating"]) {
      expect(semanticTokens.shadows).toHaveProperty(key);
    }
  });

  it("dark elevation is a hairline highlight, not a heavy black shadow", () => {
    for (const [key, token] of Object.entries(elevationShadows)) {
      if (key === "focus") continue;
      const dark = (token.value as Record<string, string>)._dark;
      expect(dark, key).toContain("inset 0 1px 0 rgba(255, 255, 255");
      for (const m of dark.matchAll(/rgba\(0, 0, 0, ([\d.]+)\)/g)) {
        expect(Number(m[1]), `${key} black alpha`).toBeLessThanOrEqual(0.4);
      }
    }
  });
});

describe("E15 motion", () => {
  it("durations and easings are plain strings (reduced-motion handling is the consumer's)", () => {
    for (const d of Object.values(durations)) expect(typeof d.value).toBe("string");
    expect(Object.fromEntries(Object.entries(durations).map(([k, v]) => [k, v.value]))).toEqual({
      instant: "0ms",
      fast: "120ms",
      base: "200ms",
      slow: "320ms",
    });
    for (const e of Object.values(easings)) expect(e.value).toMatch(/^cubic-bezier\(/);
    expect(Object.keys(easings).sort()).toEqual(["enter", "exit", "standard"]);
  });

  it("defines the five keyframes", () => {
    expect(Object.keys(motionKeyframes).sort()).toEqual([
      "fadeIn",
      "scaleIn",
      "shimmer",
      "slideInRight",
      "slideUp",
    ]);
  });
});

describe("E15 layout", () => {
  it("zIndex defines every preset-panda key plus header, in one strictly increasing order", () => {
    const order = [
      "hide",
      "base",
      "docked",
      "sticky",
      "header",
      "banner",
      "dropdown",
      "overlay",
      "modal",
      "popover",
      "toast",
      "tooltip",
      "skipLink",
    ] as const;
    // every key preset-panda defines must be overridden so none leaks through with a stale value
    for (const key of order) expect(zIndex, key).toHaveProperty(key);
    expect(Object.keys(zIndex).sort()).toEqual([...order].sort());
    const values = order.map((k) => Number(zIndex[k].value));
    expect(values).toEqual([-1, 0, 5, 10, 20, 25, 30, 40, 50, 55, 60, 65, 70]);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
  });

  it("sizes provide control heights, compact heights and a 44px touch target", () => {
    expect(sizes.touch.value).toBe("44px");
    for (const k of ["sm", "md", "lg"] as const) {
      expect(remOf(sizes.control.compact[k].value)).toBeLessThan(remOf(sizes.control[k].value));
    }
  });

  it("density tokens have a comfortable base and a _compact override that is smaller", () => {
    for (const t of Object.values(densitySpacing.density)) {
      const v = t.value as Record<string, string>;
      expect(remOf(v._compact)).toBeLessThan(remOf(v.base));
    }
    for (const t of Object.values(densitySizes.density.control)) {
      expect(t.value._compact).toContain("compact");
    }
  });
});

describe("E15 preset wiring", () => {
  const extend = (flumpPreset as any).theme.extend;

  it("registers the new token groups, textStyles and keyframes", () => {
    for (const group of [
      "lineHeights",
      "fontWeights",
      "letterSpacings",
      "durations",
      "easings",
      "zIndex",
      "sizes",
    ]) {
      expect(extend.tokens, group).toHaveProperty(group);
    }
    expect(extend.textStyles).toBe(textStyles);
    expect(extend.keyframes).toBe(motionKeyframes);
    expect(extend.semanticTokens.sizes).toBe(densitySizes);
    expect(extend.semanticTokens.spacing).toBe(densitySpacing);
  });

  it("declares the compact density condition", () => {
    expect((flumpPreset as any).conditions.extend.compact).toBe("[data-density=compact] &");
  });
});

describe("E15 self-hosted fonts", () => {
  const root = path.resolve(__dirname, "../..");
  it("fonts.css imports the three variable fonts and is exported from the package", () => {
    const css = readFileSync(path.join(root, "src/fonts/fonts.css"), "utf8");
    for (const pkg of ["inter", "plus-jakarta-sans", "jetbrains-mono"]) {
      expect(css).toContain(`@fontsource-variable/${pkg}/wght.css`);
    }
    const pkgJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    expect(pkgJson.exports["./fonts.css"]).toBe("./src/fonts/fonts.css");
    for (const dep of ["inter", "plus-jakarta-sans", "jetbrains-mono"]) {
      expect(pkgJson.dependencies[`@fontsource-variable/${dep}`]).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});
