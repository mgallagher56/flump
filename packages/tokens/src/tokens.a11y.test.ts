import { describe, expect, it } from "vitest";
import {
  BOTH,
  CHART_SERIES,
  contrast,
  KNOWN_FAILURES,
  luminanceOf,
  PASSING_PAIRS,
  type Pair,
  PRIMARY_FOREGROUND_OK,
  pairLabel,
  parseColor,
  type Rgb,
  STATUSES,
  pairContrast as sharedPairContrast,
  TEXTS,
  type Theme,
  toRgb,
} from "./contrast.js";
import { colors, fontSizes, fonts, semanticTokens } from "./index.js";

// Standard WCAG relative luminance calculation
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("Tokens & Typography A11y Suite", () => {
  it("enforces a strict 12px (0.75rem) minimum floor on fontSizes", () => {
    const minSize = parseFloat(fontSizes.xs.value);
    expect(minSize).toBeGreaterThanOrEqual(0.75); // 12px / 16px
  });

  it("provides 3-tier font stack definitions", () => {
    expect(fonts.display.value).toContain("Plus Jakarta Sans");
    expect(fonts.sans.value).toContain("Inter");
    expect(fonts.mono.value).toContain("ui-monospace");
    expect(fonts.mono.value).not.toMatch(/jetbrains/i);
  });

  it("enforces the 6 canonical semantic token namespaces and eliminates redundancies", () => {
    const namespaces = Object.keys(semanticTokens.colors);
    expect(namespaces.sort()).toEqual(
      ["border", "chart", "primary", "status", "surface", "text"].sort(),
    );

    const legacyNamespaces = [
      "financial",
      "background",
      "canvas",
      "card",
      "popover",
      "muted",
      "accent",
      "secondary",
      "destructive",
      "success",
      "warning",
      "info",
      "ring",
    ];

    for (const legacy of legacyNamespaces) {
      expect(semanticTokens.colors).not.toHaveProperty(legacy);
    }
  });

  it("removes duplicate dark.bg and trims purple and cyan to active steps", () => {
    expect((colors.dark as any).bg).toBeUndefined();
    expect(
      Object.keys(colors.purple)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([100, 400, 500, 600]);
    expect(
      Object.keys(colors.cyan)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([100, 400, 500, 600]);
  });

  it("verifies Light Mode primary text contrast exceeds WCAG AAA (7.0:1) on canvas and card", () => {
    for (const bg of ["surface.canvas", "surface.card"]) {
      const r = contrast(
        resolveColor("text.primary", "light"),
        resolveColor(bg, "light"),
        "#ffffff",
      );
      expect(r).toBeGreaterThanOrEqual(7.0);
    }
  });

  it("verifies Light Mode secondary & muted text contrast exceeds WCAG AA (4.5:1)", () => {
    for (const fg of ["text.secondary", "text.muted"]) {
      const r = contrast(
        resolveColor(fg, "light"),
        resolveColor("surface.canvas", "light"),
        "#ffffff",
      );
      expect(r).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("verifies Dark Mode text contrast meets WCAG AA (4.5:1)", () => {
    const canvas = resolveColor("surface.canvas", "dark");
    expect(contrast(resolveColor("text.primary", "dark"), canvas, canvas)).toBeGreaterThanOrEqual(
      7.0,
    );
    expect(contrast(resolveColor("text.muted", "dark"), canvas, canvas)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});

// ---------------------------------------------------------------------------
// Semantic token contrast matrix (E8 T01)
//
// Resolves semantic tokens to concrete colours per theme, composites rgba over
// the surface the token actually sits on, and checks WCAG contrast. Pairs that
// fail today are registered with `it.fails` and a finding id: the task that
// fixes the token flips them by moving the row into PASSING_PAIRS.
// ---------------------------------------------------------------------------

const REF = /^\{(.+)\}$/;

function lookup(root: unknown, path: string[]): unknown {
  let node: any = root;
  for (const key of path) {
    if (node === null || typeof node !== "object" || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

function resolveRaw(value: unknown, theme: Theme, trail: string[]): string {
  if (typeof value === "string") {
    const ref = REF.exec(value);
    if (!ref) return value;
    const path = ref[1].split(".");
    if (trail.includes(ref[1])) throw new Error(`Circular token reference: ${ref[1]}`);
    // {colors.x.y} refs point at primitives; fall back to semantic tokens.
    const target =
      lookup({ colors }, path) ?? lookup({ colors: semanticTokens.colors }, path) ?? undefined;
    if (target === undefined) throw new Error(`Unresolved token reference: ${value}`);
    return resolveRaw(target, theme, [...trail, ref[1]]);
  }
  if (value && typeof value === "object" && "value" in (value as object)) {
    return resolveRaw((value as { value: unknown }).value, theme, trail);
  }
  if (value && typeof value === "object" && "base" in (value as object)) {
    const cond = value as { base: unknown; _dark?: unknown };
    return resolveRaw(
      theme === "dark" && cond._dark !== undefined ? cond._dark : cond.base,
      theme,
      trail,
    );
  }
  throw new Error(`Cannot resolve token value: ${JSON.stringify(value)}`);
}

/** Resolve a semantic path such as "surface.card" or "border" (-> border.DEFAULT) to a colour string. */
function resolveColor(path: string, theme: Theme): string {
  let node: any = lookup(semanticTokens.colors, path.split("."));
  if (node === undefined) throw new Error(`Unresolved semantic token: ${path}`);
  if (node && typeof node === "object" && !("value" in node)) {
    if (!("DEFAULT" in node)) throw new Error(`Token group has no DEFAULT: ${path}`);
    node = node.DEFAULT;
  }
  return resolveRaw(node, theme, []);
}

/** The shared matrix (./contrast.ts) resolved against the authored tokens. */
function pairContrast(pair: Pair, theme: Theme): number {
  return sharedPairContrast(pair, theme, resolveColor);
}

function assertPair(pair: Pair) {
  for (const theme of pair.themes) {
    const ratio = pairContrast(pair, theme);
    expect(ratio, pairLabel(pair, theme)).toBeGreaterThanOrEqual(pair.min);
  }
}

describe("Semantic token contrast matrix", () => {
  it("every semanticTokens.colors leaf defines base and _dark (except primary.foreground)", () => {
    const missing: string[] = [];
    const walk = (node: any, path: string[]) => {
      if (node && typeof node === "object" && "value" in node) {
        const key = path.join(".");
        const v = node.value;
        const ok = typeof v === "object" && v !== null && "base" in v && "_dark" in v;
        if (!ok && key !== "primary.foreground") missing.push(key);
        return;
      }
      for (const [k, child] of Object.entries(node)) walk(child, [...path, k]);
    };
    walk(semanticTokens.colors, []);
    expect(missing).toEqual([]);
  });

  it("resolveColor follows references and DEFAULT keys", () => {
    expect(resolveColor("surface.card", "dark").toLowerCase()).toBe("#272320");
    expect(resolveColor("surface.card", "light")).toBe("#fffdf9");
    expect(resolveColor("primary", "light")).toBe(colors.teal[600].value);
    expect(resolveColor("border", "light")).toBe(colors.sand[250].value);
    expect(resolveColor("border.input", "light")).toBe(colors.sand[500].value);
    expect(resolveColor("border.input", "dark")).toBe(colors.dark.borderInput.value);
  });

  it("resolveColor throws on unresolved tokens and references", () => {
    expect(() => resolveColor("surface.nope", "light")).toThrow(/Unresolved/);
    expect(() => resolveColor("status", "light")).toThrow(/DEFAULT/);
    expect(() => resolveRaw("{colors.nope.500}", "light", [])).toThrow(/Unresolved/);
  });

  it("composites rgba over the surface it sits on", () => {
    const surface = resolveColor("surface.card", "dark");
    // rgba composites over the surface it sits on: white at 16% over the dark card.
    const ratio = contrast("rgba(255, 255, 255, 0.16)", surface, surface);
    expect(ratio).toBeCloseTo(1.64, 1);
    // Compositing over a different surface gives a different answer (not over white or black only).
    const onCanvas = contrast(
      "rgba(255, 255, 255, 0.16)",
      resolveColor("surface.canvas", "dark"),
      resolveColor("surface.canvas", "dark"),
    );
    expect(onCanvas).not.toBeCloseTo(ratio, 3);
    expect(toRgb("rgba(255, 255, 255, 0.5)", "#000000").map(Math.round)).toEqual([128, 128, 128]);
  });

  it("contrast matches known WCAG ratios", () => {
    expect(contrast("#000000", "#ffffff", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("agrees with the legacy hex contrast helper", () => {
    const a = colors.slate[900].value;
    expect(contrast(a, "#ffffff", "#ffffff")).toBeCloseTo(getContrastRatio(a, "#ffffff"), 6);
  });

  it.each(PASSING_PAIRS)("$fg on $bg >= $min ($role, $themes)", (pair) => {
    assertPair(pair);
  });

  it("primary split reports computed ratios (accent vs solid)", () => {
    const r = (fg: string, bg: string, theme: Theme) =>
      pairContrast({ fg, bg, themes: [theme], min: 4.5, role: "text" }, theme);
    // The dark accent (#5cc4ae / #6fd0ba) fails white labels (2.11:1), so solid stays deep teal.
    expect(r("primary.foreground", "primary.solid", "dark")).toBeGreaterThanOrEqual(6.2);
    expect(r("primary.foreground", "primary.hover", "dark")).toBeGreaterThanOrEqual(7.8);
    expect(r("primary", "surface.card", "dark")).toBeGreaterThanOrEqual(5.8);
    // solid is deliberately identical in both themes (white label keeps AA).
    expect(resolveColor("primary.solid", "dark")).toBe(resolveColor("primary.solid", "light"));
    expect(resolveColor("primary", "dark")).toBe(colors.dark.primary.value);
  });

  it("border.input reaches 3:1 on every surface in both themes", () => {
    for (const theme of BOTH) {
      for (const bg of ["card", "canvas", "sunken", "overlay", "subtle"]) {
        const r = pairContrast(
          { fg: "border.input", bg: `surface.${bg}`, themes: [theme], min: 3, role: "ui" },
          theme,
        );
        expect(r).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("the harness fails on a deliberately violating pair (surface.card on surface.card is 1:1)", () => {
    const bad: Pair = {
      fg: "surface.card",
      bg: "surface.card",
      themes: BOTH,
      min: 3,
      role: "ui",
    };
    expect(() => assertPair(bad)).toThrow();
    expect(pairContrast(bad, "light")).toBeCloseTo(1, 5);
    // and a near-identical but distinct pair still fails the text threshold
    expect(() =>
      assertPair({
        fg: "surface.canvas",
        bg: "surface.sunken",
        themes: BOTH,
        min: 4.5,
        role: "text",
      }),
    ).toThrow();
  });

  it("primary.foreground must NOT be used on forbidden status fills (measured < 4.5:1)", () => {
    const forbidden: [string, Theme][] = [];
    for (const s of STATUSES) {
      for (const theme of BOTH) {
        if (!PRIMARY_FOREGROUND_OK[s].includes(theme)) forbidden.push([s, theme]);
      }
    }
    // warning (both themes) and positive/info/neutral in dark are the documented no-white-text fills.
    expect(forbidden.map(([s, t]) => `${s}.${t}`).sort()).toEqual(
      ["info.dark", "neutral.dark", "positive.dark", "warning.dark", "warning.light"].sort(),
    );
    for (const [s, theme] of forbidden) {
      const ratio = pairContrast(
        {
          fg: "primary.foreground",
          bg: `status.${s}.solid`,
          themes: [theme],
          min: 4.5,
          role: "text",
        },
        theme,
      );
      expect(ratio, `${s}.solid ${theme}`).toBeLessThan(4.5);
    }
  });

  describe.skipIf(KNOWN_FAILURES.length === 0)(
    "known failures (flip by moving the row to PASSING_PAIRS)",
    () => {
      for (const { finding, pair } of KNOWN_FAILURES) {
        it.fails(`[${finding}] ${pair.fg} on ${pair.bg} >= ${pair.min} (${pair.themes.join(", ")})`, () => {
          assertPair(pair);
        });
      }
    },
  );
});

// ---------------------------------------------------------------------------
// E15 T1: new keys (scrim, series6..8, projection, band, baseline), dark surface steps, CVD
// ---------------------------------------------------------------------------

describe("E15 dark surface elevation steps", () => {
  it("canvas < card < overlay (sunken is a deliberate recess, ~1.03:1 under canvas) each differ by at least 1.05:1 so stacked surfaces stay legible", () => {
    const l = (s: string) => luminanceOf(toRgb(resolveColor(s, "dark")));
    const steps = [
      ["surface.canvas", "surface.card"],
      ["surface.card", "surface.overlay"],
    ] as const;
    for (const [lower, upper] of steps) {
      const ratio = (l(upper) + 0.05) / (l(lower) + 0.05);
      expect(ratio, `${upper} over ${lower}`).toBeGreaterThanOrEqual(1.05);
    }
  });
});

describe("E15 surface.scrim", () => {
  it("is translucent, defines both themes, and dims the card behind it", () => {
    for (const theme of BOTH) {
      const scrim = resolveColor("surface.scrim", theme);
      const { alpha } = parseColor(scrim);
      expect(alpha).toBeGreaterThan(0.3);
      expect(alpha).toBeLessThan(0.8);
      const card = resolveColor("surface.card", theme);
      // The composited backdrop must differ from the bare card (light ~2.5:1; dark can only dim an
      // already-dark card by ~1.1:1, so dark modals also rely on surface.overlay + elevation).
      expect(contrast(scrim, card, card), theme).toBeGreaterThanOrEqual(1.1);
    }
  });
});

describe("E15 chart.band (fill behind lines)", () => {
  it("is visible against the card (>= 1.1:1 once composited) without hiding the lines drawn over it", () => {
    for (const theme of BOTH) {
      const card = resolveColor("surface.card", theme);
      const band = resolveColor("chart.band", theme);
      expect(parseColor(band).alpha).toBeLessThan(0.3);
      expect(contrast(band, card, card), `band vs card ${theme}`).toBeGreaterThanOrEqual(1.1);
      // chart.primary line drawn across the band still reaches 3:1 against the composited band.
      expect(
        contrast(resolveColor("chart.primary", theme), band, card),
        `primary line on band ${theme}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

// Machado, Oliveira & Fernandes (2009) full-severity dichromacy matrices, applied in linear RGB.
const CVD: Record<string, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function simulate(rgb: Rgb, kind: string): number[] {
  const lin = rgb.map((v) => toLinear(v / 255));
  return CVD[kind].map((row) =>
    Math.min(1, Math.max(0, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])),
  );
}

/** Linear sRGB (D65) to CIE L*a*b*. */
function toLab([r, g, b]: number[]): [number, number, number] {
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE76(a: Rgb, b: Rgb, kind: string): number {
  const p = toLab(simulate(a, kind));
  const q = toLab(simulate(b, kind));
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * Minimum CIE76 deltaE between ADJACENT series under protan/deutan/tritan simulation.
 * A just-noticeable difference is ~2.3; 15 is roughly six JNDs, enough to tell two thin lines
 * apart at a glance. Measured minimum is recorded in docs/design/e15/tokens.md. Series that are
 * not adjacent may be close under CVD; charts must still add direct labels, markers or dashes.
 */
const MIN_CVD_DELTA_E = 15;

describe("E15 chart series CVD distinguishability", () => {
  for (const theme of BOTH) {
    it(`adjacent series differ by deltaE76 >= ${MIN_CVD_DELTA_E} under every CVD simulation (${theme})`, () => {
      for (let i = 1; i < CHART_SERIES.length; i++) {
        const a = toRgb(resolveColor(`chart.series${i}`, theme));
        const b = toRgb(resolveColor(`chart.series${i + 1}`, theme));
        for (const kind of Object.keys(CVD)) {
          expect(
            deltaE76(a, b, kind),
            `series${i} vs series${i + 1} (${kind}, ${theme})`,
          ).toBeGreaterThanOrEqual(MIN_CVD_DELTA_E);
        }
      }
    });
  }

  it("also separates normal vision (sanity: simulation of identical colours is 0)", () => {
    const a = toRgb(resolveColor("chart.series1", "light"));
    expect(deltaE76(a, a, "deuteranopia")).toBe(0);
    expect(
      deltaE76(a, toRgb(resolveColor("chart.series2", "light")), "deuteranopia"),
    ).toBeGreaterThan(0);
  });

  it("keeps chart.wealth, chart.debt and chart.warning aligned with their series", () => {
    for (const theme of BOTH) {
      expect(resolveColor("chart.wealth", theme)).toBe(resolveColor("chart.series2", theme));
      expect(resolveColor("chart.debt", theme)).toBe(resolveColor("chart.series3", theme));
      expect(resolveColor("chart.warning", theme)).toBe(resolveColor("chart.series7", theme));
    }
  });

  it("uses apricot, not red, for liabilities (chart.debt hue 25-50 degrees)", () => {
    for (const theme of BOTH) {
      const [r, g, b] = toRgb(resolveColor("chart.debt", theme));
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const hue = (60 * (g - b)) / (max - min);
      expect(hue).toBeGreaterThan(25);
      expect(hue).toBeLessThan(50);
    }
  });
});

describe("E15 new colour keys exist with light and dark values", () => {
  it.each([
    "surface.scrim",
    "surface.hero",
    "chart.series6",
    "chart.series7",
    "chart.series8",
    "chart.projection",
    "chart.band",
    "chart.baseline",
  ])("%s", (key) => {
    const light = resolveColor(key, "light");
    const dark = resolveColor(key, "dark");
    expect(light).toBeTruthy();
    expect(dark).toBeTruthy();
    expect(light).not.toBe(dark);
  });
});

// ---------------------------------------------------------------------------
// Round 5 (Direction C palette): surface separation, hue separation, chart distinctness
// ---------------------------------------------------------------------------

/** Perceptual distance of two resolved colours under normal vision (CIE76, no CVD simulation). */
function deltaE(a: string, b: string, theme: Theme, under = "surface.card"): number {
  const u = resolveColor(under, theme);
  const pa = toLab(simulateIdentity(toRgb(resolveColor(a, theme), u)));
  const pb = toLab(simulateIdentity(toRgb(resolveColor(b, theme), u)));
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}

function simulateIdentity(rgb: Rgb): number[] {
  return rgb.map((v) => toLinear(v / 255));
}

/** About one just-noticeable difference (2.3); every pair of page surfaces must clear it. */
const MIN_SURFACE_DELTA_E = 2;
const PAGE_SURFACES = ["canvas", "card", "sunken", "subtle", "overlay"];

describe("Round 5 page surface separation", () => {
  for (const theme of BOTH) {
    it(`canvas, card, sunken, subtle and overlay are pairwise distinguishable (${theme}, deltaE76 >= ${MIN_SURFACE_DELTA_E})`, () => {
      for (let i = 0; i < PAGE_SURFACES.length; i++) {
        for (let j = i + 1; j < PAGE_SURFACES.length; j++) {
          const a = `surface.${PAGE_SURFACES[i]}`;
          const b = `surface.${PAGE_SURFACES[j]}`;
          expect(deltaE(a, b, theme), `${a} vs ${b} (${theme})`).toBeGreaterThanOrEqual(
            MIN_SURFACE_DELTA_E,
          );
        }
      }
    });
  }

  it("light surfaces are warm sand (red channel >= blue channel), dark are warm charcoal", () => {
    for (const theme of BOTH) {
      for (const s of PAGE_SURFACES) {
        const [r, , b] = toRgb(resolveColor(`surface.${s}`, theme));
        expect(r, `surface.${s} ${theme}`).toBeGreaterThanOrEqual(b);
      }
    }
  });

  it("the hero block is a distinct deep teal on every page surface (deltaE76 >= 20)", () => {
    for (const theme of BOTH) {
      for (const s of PAGE_SURFACES) {
        expect(
          deltaE("surface.hero", `surface.${s}`, theme),
          `${s} ${theme}`,
        ).toBeGreaterThanOrEqual(20);
      }
    }
  });
});

describe("Round 5 review follow-ups: projection and positive under CVD", () => {
  it("chart.projection is at least 15 deltaE from every chart series and accent (normal vision, both themes)", () => {
    for (const theme of BOTH) {
      for (const other of [
        ...CHART_SERIES,
        "chart.primary",
        "chart.accentPurple",
        "chart.accentCyan",
      ]) {
        expect(
          deltaE("chart.projection", other, theme),
          `projection vs ${other} ${theme}`,
        ).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it("status.positive.solid is at least 15 deltaE from primary and chart.wealth under normal, protan, deutan and tritan simulation", () => {
    for (const theme of BOTH) {
      const pos = toRgb(resolveColor("status.positive.solid", theme));
      for (const other of ["primary", "chart.primary", "chart.wealth"]) {
        const o = toRgb(resolveColor(other, theme));
        expect(deltaE("status.positive.solid", other, theme)).toBeGreaterThanOrEqual(15);
        for (const kind of Object.keys(CVD)) {
          expect(
            deltaE76(pos, o, kind),
            `positive.solid vs ${other} (${kind}, ${theme})`,
          ).toBeGreaterThanOrEqual(MIN_CVD_DELTA_E);
        }
      }
    }
  });
});

describe("Round 5 hue and series separation", () => {
  const MIN_HUE_DELTA_E = 15;

  it("chart.wealth is distinguishable from chart.primary (deltaE76 >= 15, both themes)", () => {
    for (const theme of BOTH) {
      expect(deltaE("chart.wealth", "chart.primary", theme), theme).toBeGreaterThanOrEqual(
        MIN_HUE_DELTA_E,
      );
    }
  });

  it("chart.wealth stays distinguishable from chart.primary under every CVD simulation (>= 15)", () => {
    for (const theme of BOTH) {
      const a = toRgb(resolveColor("chart.wealth", theme));
      const b = toRgb(resolveColor("chart.primary", theme));
      for (const kind of Object.keys(CVD)) {
        expect(deltaE76(a, b, kind), `${kind} ${theme}`).toBeGreaterThanOrEqual(MIN_CVD_DELTA_E);
      }
    }
  });

  it("status.positive is clearly distinct from primary and from the teal chart series", () => {
    for (const theme of BOTH) {
      for (const [pos, other] of [
        ["status.positive.solid", "primary"],
        ["status.positive.solid", "chart.primary"],
        ["status.positive.solid", "chart.wealth"],
        ["status.positive.text", "primary"],
        ["status.positive.bg", "primary.subtle"],
      ] as const) {
        expect(deltaE(pos, other, theme), `${pos} vs ${other} ${theme}`).toBeGreaterThanOrEqual(
          pos.endsWith("bg") ? 10 : MIN_HUE_DELTA_E,
        );
      }
    }
  });

  it("status.positive is yellower than primary (hue angle in 70-125 degrees vs teal near 170)", () => {
    const hue = ([r, g, b]: Rgb) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    for (const theme of BOTH) {
      const pos = hue(toRgb(resolveColor("status.positive.solid", theme)));
      const pri = hue(toRgb(resolveColor("primary", theme)));
      expect(pos, `positive ${theme}`).toBeGreaterThan(70);
      expect(pos, `positive ${theme}`).toBeLessThan(125);
      expect(pri - pos, `primary vs positive ${theme}`).toBeGreaterThan(40);
    }
  });

  it("status.info stays indigo (hue 235-260 degrees)", () => {
    for (const theme of BOTH) {
      const [r, g, b] = toRgb(resolveColor("status.info.solid", theme));
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const h = (60 * ((r - g) / (max - min) + 4) + 360) % 360;
      expect(max).toBe(b);
      expect(h).toBeGreaterThan(235);
      expect(h).toBeLessThan(260);
    }
  });

  it("chart.debt (apricot) is distinct from chart.primary and chart.wealth (deltaE76 >= 30)", () => {
    for (const theme of BOTH) {
      for (const other of ["chart.primary", "chart.wealth"]) {
        expect(deltaE("chart.debt", other, theme), `${other} ${theme}`).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it("all eight series are pairwise distinguishable under normal vision (deltaE76 >= 15)", () => {
    for (const theme of BOTH) {
      for (let i = 0; i < CHART_SERIES.length; i++) {
        for (let j = i + 1; j < CHART_SERIES.length; j++) {
          const d = deltaE(CHART_SERIES[i], CHART_SERIES[j], theme);
          // series3 (debt) and series7 (warning) are both warm but stay clearly apart on the card.
          expect(d, `${CHART_SERIES[i]} vs ${CHART_SERIES[j]} ${theme}`).toBeGreaterThanOrEqual(
            MIN_HUE_DELTA_E,
          );
        }
      }
    }
  });

  it("chart.band is a teal alpha fill (green channel > red channel, low alpha)", () => {
    for (const theme of BOTH) {
      const { rgb, alpha } = parseColor(resolveColor("chart.band", theme));
      expect(alpha).toBeLessThan(0.3);
      expect(rgb[1]).toBeGreaterThan(rgb[0]);
      expect(Math.abs(rgb[1] - rgb[2])).toBeLessThan(40);
    }
  });

  it("primary.solid stays deep teal in both themes and the dark accent would fail a white label", () => {
    expect(resolveColor("primary.solid", "light")).toBe(resolveColor("primary.solid", "dark"));
    expect(contrast("#ffffff", "#5cc4ae", "#ffffff")).toBeLessThan(3);
    expect(
      pairContrast(
        { fg: "primary.foreground", bg: "primary.solid", themes: BOTH, min: 4.5, role: "text" },
        "dark",
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

// ---------------------------------------------------------------------------
// E16 PR 1: domain tints (P9, D16 option a) and light card separation (plan 4.1)
// ---------------------------------------------------------------------------

const TINTS = ["teal", "apricot", "sage"].map((t) => `surface.tint.${t}`);

describe("E16 surface tints", () => {
  it.each(TINTS)(
    "%s carries text.primary, text.secondary and text.muted at 4.5:1 in both themes",
    (tint) => {
      for (const fg of TEXTS) assertPair({ fg, bg: tint, themes: BOTH, min: 4.5, role: "text" });
    },
  );

  it("each tint is at least 2 deltaE76 from every page surface and every other tint", () => {
    for (const theme of BOTH) {
      for (const tint of TINTS) {
        const others = [
          ...PAGE_SURFACES.map((s) => `surface.${s}`),
          ...TINTS.filter((t) => t !== tint),
        ];
        for (const other of others) {
          expect(
            deltaE(tint, other, theme),
            `${tint} vs ${other} (${theme})`,
          ).toBeGreaterThanOrEqual(MIN_SURFACE_DELTA_E);
        }
      }
    }
  });

  it("tints differ between themes", () => {
    for (const tint of TINTS)
      expect(resolveColor(tint, "light")).not.toBe(resolveColor(tint, "dark"));
  });
});

describe("E16 light card separation", () => {
  it("the card edge (border.DEFAULT) reads against the canvas and the card at 1.3:1 or more", () => {
    for (const theme of BOTH) {
      const edge = resolveColor("border", theme);
      for (const s of ["surface.canvas", "surface.card"]) {
        const bg = resolveColor(s, theme);
        expect(contrast(edge, bg, bg), `${s} (${theme})`).toBeGreaterThanOrEqual(1.3);
      }
    }
  });
});
