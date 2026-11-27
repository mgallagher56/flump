/**
 * Slice F2 of the marketing design rollout (docs/design/motion/ROLLOUT-PLAN.md section 2;
 * STYLE-GUIDE 2.7 and 11): the calm motion scale, the orb colour sets and the card materials.
 * Contrast for the materials is in the shared matrix (contrast.ts, MC3).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseColor, type Rgb } from "./contrast.js";
import {
  durations,
  easings,
  elevationShadows,
  marketingDurations,
  marketingEasings,
  semanticTokens,
} from "./index.js";

const ms = (v: string) => {
  const m = /^(\d+)ms$/.exec(v);
  if (!m) throw new Error(`not a duration in ms: ${v}`);
  return Number(m[1]);
};

describe("marketing calm scale (STYLE-GUIDE 11, UX-GUIDELINES M2)", () => {
  it("is prototype 11's TIMING times the page's 1.4 slowdown", () => {
    // Worked by hand from prototypes/shared/pace.tsx at branch tip 588ba532d:
    // hover 420 x 1.4 = 588; stagger 140 x 1.4 = 196; disclosure 700 x 1.4 = 980;
    // entry 1100 x 1.4 = 1540; count 1600 x 1.4 = 2240; chart 1900 x 1.4 = 2660;
    // hero 3400 x 1.4 = 4760. glide (DECISIONS D7) is the short end of the scale: 588.
    expect(
      Object.fromEntries(Object.entries(marketingDurations).map(([k, t]) => [k, t.value])),
    ).toEqual({
      glide: "588ms",
      hover: "588ms",
      stagger: "196ms",
      disclosure: "980ms",
      entry: "1540ms",
      count: "2240ms",
      chart: "2660ms",
      hero: "4760ms",
    });
  });

  it("glide is no longer than any other movement on the scale (stagger is a gap, not a movement)", () => {
    const glide = ms(marketingDurations.glide.value);
    for (const [key, token] of Object.entries(marketingDurations)) {
      if (key === "stagger" || key === "glide") continue;
      expect(glide, key).toBeLessThanOrEqual(ms(token.value));
    }
  });

  it("has the two calm easings and neither overshoots (every control point inside 0 to 1)", () => {
    expect(marketingEasings.calm.value).toBe("cubic-bezier(0.25, 0.1, 0.2, 1)");
    expect(marketingEasings.calmInOut.value).toBe("cubic-bezier(0.45, 0, 0.3, 1)");
    for (const [key, token] of Object.entries(marketingEasings)) {
      const points = /^cubic-bezier\(([^)]+)\)$/.exec(token.value)?.[1]?.split(",").map(Number);
      expect(points, key).toHaveLength(4);
      for (const p of points ?? []) {
        expect(p, key).toBeGreaterThanOrEqual(0);
        expect(p, key).toBeLessThanOrEqual(1);
      }
    }
  });

  it("leaves the app scale untouched: no marketing key in durations or easings", () => {
    expect(durations.fast.value).toBe("120ms");
    expect(durations.base.value).toBe("200ms");
    expect(durations.slow.value).toBe("320ms");
    for (const key of Object.keys(marketingDurations)) {
      expect(Object.keys(durations), key).not.toContain(key);
    }
    for (const key of Object.keys(marketingEasings)) {
      expect(Object.keys(easings), key).not.toContain(key);
    }
  });

  it("stays out of the native theme (the apps never use it)", () => {
    const native = readFileSync(new URL("./native.generated.ts", import.meta.url), "utf8");
    expect(native).not.toContain("2240");
    expect(native).not.toContain("calmInOut");
  });
});

type Tree = { [key: string]: unknown };
const leaves = (tree: Tree, trail: string[] = []): [string, { base: string; _dark: string }][] =>
  Object.entries(tree).flatMap(([k, v]) => {
    const node = v as Tree;
    return "value" in node
      ? [[[...trail, k].join("."), node.value as { base: string; _dark: string }]]
      : leaves(node, [...trail, k]);
  });

const orb = leaves(semanticTokens.colors.orb as Tree, ["orb"]);
const material = leaves(semanticTokens.colors.material as Tree, ["material"]);

describe("orb colour sets (STYLE-GUIDE 2.7, MC1)", () => {
  it("has core, shade, bubble, bubbleShade and rim in both sets", () => {
    expect(orb.map(([k]) => k).sort()).toEqual(
      ["skyTeal", "violetRose"]
        .flatMap((set) =>
          ["core", "shade", "bubble", "bubbleShade", "rim"].map((t) => `orb.${set}.${t}`),
        )
        .sort(),
    );
  });

  it("has distinct light and dark values, all concrete colours", () => {
    for (const [key, v] of orb) {
      expect(v.base, key).not.toBe(v._dark);
      expect(() => parseColor(v.base), key).not.toThrow();
      expect(() => parseColor(v._dark), key).not.toThrow();
    }
  });

  it("never references another token, so surface.tint.* can never feed the orb", () => {
    for (const [key, v] of orb) {
      expect(`${v.base} ${v._dark}`, key).not.toMatch(/\{/);
    }
  });

  it("keeps the rim translucent so a bubble edge stays soft", () => {
    for (const [key, v] of orb.filter(([k]) => k.endsWith(".rim"))) {
      expect(parseColor(v.base).alpha, key).toBeLessThan(0.5);
      expect(parseColor(v._dark).alpha, key).toBeLessThan(0.5);
    }
  });
});

/** Hue-free check: the spread between the largest and smallest channel, 0 for a pure grey. */
const spread = ([r, g, b]: Rgb) => Math.max(r, g, b) - Math.min(r, g, b);
/** HSL hue in degrees. */
function hue([r, g, b]: Rgb): number {
  const max = Math.max(r, g, b);
  const d = spread([r, g, b]);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const RESOLVED: Record<string, string> = {
  "{colors.mint.950}": "#f8fcfa",
  "{colors.mint.250}": "#c8dcd5",
  "{colors.dark.surface}": "#1d2128",
  "{colors.dark.border}": "#303740",
};

describe("card materials are neutral (STYLE-GUIDE 2.7: no violet or rose)", () => {
  it("has the glass and paper keys the prototype's cards need", () => {
    expect(material.map(([k]) => k).sort()).toEqual(
      [
        "material.glass.border",
        "material.glass.fill",
        "material.glass.light",
        "material.glass.sheen",
        "material.paper.edge",
        "material.paper.fill",
        "material.paper.rule",
      ].sort(),
    );
  });

  it("references only neutral mint and Midnight tokens, never an orb, tint, chart or accent", () => {
    for (const [key, v] of material) {
      for (const raw of [v.base, v._dark]) {
        expect(raw, key).not.toMatch(/orb|tint|chart|accent|purple|pink|series/);
        if (raw.startsWith("{")) expect(Object.keys(RESOLVED), key).toContain(raw);
      }
    }
  });

  // Violet and rose, as hue: 240 to 350 degrees. The band is checked against the real colours
  // below: the palest violet, the bubble #e3e0f4, sits at about 249 and rose #b03f6a at about 337.
  const VIOLET_ROSE = (h: number) => h >= 240 && h <= 350;

  it("the violet and rose band holds every violetRose colour", () => {
    for (const [key, v] of orb.filter(([k]) => k.startsWith("orb.violetRose"))) {
      for (const raw of [v.base, v._dark]) {
        const h = hue(parseColor(raw).rgb);
        expect(VIOLET_ROSE(h), `${key} ${raw} hue ${h.toFixed(0)}`).toBe(true);
      }
    }
  });

  it("no material colour has a violet or rose hue", () => {
    // The materials today: mint.950 about 150, mint.250 about 158, dark.surface and dark.border
    // about 216, the paper rule 180 (light) and 40 (dark).
    for (const [key, v] of material) {
      for (const raw of [v.base, v._dark]) {
        const colour = parseColor(RESOLVED[raw] ?? raw).rgb;
        if (spread(colour) < 6) continue; // a grey has no hue to speak of
        const h = hue(colour);
        expect(VIOLET_ROSE(h), `${key} ${raw} hue ${h.toFixed(0)}`).toBe(false);
      }
    }
  });

  it("shadows.glass and shadows.paper exist in both themes and use no orb colour", () => {
    for (const key of ["glass", "paper"] as const) {
      const v = elevationShadows[key].value;
      expect(v.base, key).toBeTruthy();
      expect(v._dark, key).toBeTruthy();
      expect(`${v.base} ${v._dark}`, key).not.toMatch(/orb|tint|purple|pink|series/);
    }
  });
});
