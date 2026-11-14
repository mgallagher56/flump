import { describe, expect, it } from "vitest";
import {
  densityRadii,
  densitySizes,
  densitySpacing,
  durations,
  easings,
  elevationShadows,
  fontFamilies,
  fontSizes,
  fonts,
  fontWeights,
  motionKeyframes,
  pageSpacing,
  radii,
  semanticTokens,
  shadows,
  sizes,
  textStyles,
  zIndex,
} from "./index.js";

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
        "numeric.hero",
        "numeric.unset",
        "numeric.kpi",
        "numeric.lg",
        "numeric.md",
        "numeric.sm",
      ].sort(),
    );
  });

  it("every numeric style carries tabular-nums", () => {
    const numeric = leaves.filter((l) => l.path.startsWith("numeric."));
    expect(numeric).toHaveLength(6);
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

  it("uses fluid clamp() only on display, heading.xl and numeric.hero, and clamp minimums stay >= 12px", () => {
    const fluid = leaves.filter((l) => l.value.fontSize.startsWith("clamp(")).map((l) => l.path);
    expect(fluid.sort()).toEqual(["display", "heading.xl", "numeric.hero"]);
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

describe("E16 type scale (PR 1, plan 4.2)", () => {
  it("every textStyle and fontWeights token stays at or below 700", () => {
    for (const l of leaves) expect(Number(l.value.fontWeight), l.path).toBeLessThanOrEqual(700);
    for (const [key, t] of Object.entries(fontWeights)) {
      expect(Number(t.value), key).toBeLessThanOrEqual(700);
    }
  });

  it("no textStyle sets uppercase or caps tracking (sentence case, P7.3)", () => {
    for (const l of leaves) {
      expect(l.value, l.path).not.toHaveProperty("textTransform");
      if (l.path.startsWith("label.")) expect(l.value, l.path).not.toHaveProperty("letterSpacing");
    }
  });

  it("numeric.hero is the bold fluid headline figure; numeric.unset is body size and regular", () => {
    const style = (p: string) => leaves.find((l) => l.path === p)?.value ?? {};
    expect(style("numeric.hero").fontWeight).toBe("700");
    expect(style("numeric.hero").fontSize).toMatch(/^clamp\(2\.25rem, .+, 3rem\)$/);
    expect(style("numeric.unset").fontSize).toBe(style("body.md").fontSize);
    expect(style("numeric.unset").fontWeight).toBe("400");
  });

  it("fontSizes 4xl to 6xl are 36, 48 and 60px", () => {
    expect(fontSizes["4xl"].value).toBe("2.25rem");
    expect(fontSizes["5xl"].value).toBe("3rem");
    expect(fontSizes["6xl"].value).toBe("3.75rem");
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

  it("E16: the light card shadow has a contact shadow plus a soft lift layer", () => {
    expect(shadows.cardLight.value).toBe(
      "0 1px 2px rgba(43, 38, 32, 0.08), 0 4px 14px rgba(43, 38, 32, 0.07)",
    );
    expect((elevationShadows.card.value as Record<string, string>).base).toBe(
      "{shadows.cardLight}",
    );
  });

  it("keeps the legacy card, cardHover and floating keys", () => {
    for (const key of ["card", "cardHover", "floating"]) {
      expect(semanticTokens.shadows).toHaveProperty(key);
    }
  });

  it("light elevation values use only the warm ink 43, 38, 32 (no cool slate or blue)", () => {
    const lights = [
      ...Object.entries(elevationShadows)
        .filter(([key]) => key !== "focus")
        .map(([key, t]) => [key, (t.value as Record<string, string>).base] as const),
      ...Object.entries(shadows).map(([key, t]) => [key, t.value] as const),
    ].filter(([, v]) => v.includes("rgba("));
    expect(lights.length).toBeGreaterThanOrEqual(6);
    for (const [key, value] of lights) {
      for (const m of value.matchAll(/rgba\((\d+), (\d+), (\d+),/g)) {
        expect(m.slice(1, 4).map(Number), key).toEqual([43, 38, 32]);
      }
    }
  });

  it("every dark elevation key (except focus) has the 1px hairline ring", () => {
    for (const [key, token] of Object.entries(elevationShadows)) {
      if (key === "focus") continue;
      expect((token.value as Record<string, string>)._dark, key).toContain(
        "0 0 0 1px rgba(255, 255, 255",
      );
    }
  });

  it("dark elevation is a hairline highlight, not a heavy black shadow", () => {
    for (const [key, token] of Object.entries(elevationShadows)) {
      if (key === "focus") continue;
      const dark = (token.value as Record<string, string>)._dark;
      expect(dark, key).toContain("inset 0 1px 0 rgba(255, 255, 255");
      for (const m of dark.matchAll(/rgba\(0, 0, 0, ([\d.]+)\)/g)) {
        expect(Number(m[1]), `${key} black alpha`).toBeLessThanOrEqual(0.3);
      }
    }
  });
});

describe("E15 radii (round 5, tied to density)", () => {
  const sem = densityRadii.radii;
  const px = (v: string) => Number.parseFloat(v);
  const pair = (k: keyof typeof sem) => sem[k].value as { base: string; _compact: string };

  it("every semantic radius has a compact value no larger than its comfortable base", () => {
    for (const k of Object.keys(sem) as (keyof typeof sem)[]) {
      expect(px(pair(k)._compact), k).toBeLessThanOrEqual(px(pair(k).base));
    }
  });

  it("comfortable cards and trays are 16 and 24px, compact 8 and 12px; aliases match", () => {
    expect([pair("xl").base, pair("2xl").base]).toEqual(["16px", "24px"]);
    expect([pair("xl")._compact, pair("2xl")._compact]).toEqual(["8px", "12px"]);
    expect(pair("card")).toEqual(pair("xl"));
    expect(pair("tray")).toEqual(pair("2xl"));
    expect(pair("control")).toEqual(pair("md"));
  });

  it("ordering sm <= md <= lg <= xl <= 2xl holds (non-strictly) within each density", () => {
    const steps = ["sm", "md", "lg", "xl", "2xl"] as const;
    for (const mode of ["base", "_compact"] as const) {
      for (let i = 1; i < steps.length; i++) {
        expect(px(pair(steps[i])[mode]), `${mode} ${steps[i]}`).toBeGreaterThanOrEqual(
          px(pair(steps[i - 1])[mode]),
        );
      }
    }
  });

  it("is additive: primitive radii keep every key and the preset wires the semantic set", () => {
    for (const k of ["none", "xs", "sm", "md", "lg", "xl", "2xl", "full"]) {
      expect(radii).toHaveProperty(k);
    }
    expect(semanticTokens.radii).toBe(densityRadii.radii);
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
      loop: "800ms",
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

  it("E16 P13 page template: 1200px content, 16/24/40 gutters, 20/32 top, 32 section gap", () => {
    expect(sizes.page.max.value).toBe("1200px");
    const p = pageSpacing.page;
    expect([p.gutter.sm, p.gutter.md, p.gutter.lg].map((t) => t.value)).toEqual([
      "16px",
      "24px",
      "40px",
    ]);
    expect([p.top.sm.value, p.top.lg.value, p.section.value]).toEqual(["20px", "32px", "32px"]);
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
