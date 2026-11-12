import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colors, fontSizes, fonts, semanticTokens } from "./index";

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
    expect(fonts.mono.value).toContain("JetBrains Mono");
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

  it("verifies Light Mode primary text contrast exceeds WCAG AAA (7.0:1) on canvas", () => {
    const textPrimary = colors.slate[900].value;
    const canvasBg = "#ffffff";
    const contrast = getContrastRatio(textPrimary, canvasBg);
    expect(contrast).toBeGreaterThanOrEqual(7.0); // AAA standard
  });

  it("verifies Light Mode secondary & muted text contrast exceeds WCAG AA (4.5:1)", () => {
    const textSecondary = colors.slate[700].value;
    const textMuted = colors.slate[600].value;
    const canvasBg = "#ffffff";

    expect(getContrastRatio(textSecondary, canvasBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(textMuted, canvasBg)).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies Dark Mode text contrast meets WCAG AA (4.5:1)", () => {
    const textPrimaryDark = "#f8fafc";
    const textMutedDark = colors.slate[400].value;
    const darkCanvas = colors.dark.canvas.value;

    expect(getContrastRatio(textPrimaryDark, darkCanvas)).toBeGreaterThanOrEqual(7.0);
    expect(getContrastRatio(textMutedDark, darkCanvas)).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies semantic status color contrasts meet WCAG standards on their badges", () => {
    // Success badge light: text on light green bg
    expect(
      getContrastRatio(colors.success[700].value, colors.success[50].value),
    ).toBeGreaterThanOrEqual(4.5);
    // Warning badge light: text on light amber bg
    expect(
      getContrastRatio(colors.warning[700].value, colors.warning[50].value),
    ).toBeGreaterThanOrEqual(4.5);
    // Danger badge light: text on light red bg
    expect(
      getContrastRatio(colors.destructive[700].value, colors.destructive[50].value),
    ).toBeGreaterThanOrEqual(4.5);
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

type Theme = "light" | "dark";
type Rgb = [number, number, number];
type Role = "text" | "ui" | "graphic";

interface Pair {
  fg: string;
  bg: string;
  themes: Theme[];
  min: 4.5 | 3;
  role: Role;
  /** Surface that an rgba bg (or fg) is composited over. Defaults to surface.card. */
  under?: string;
}

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

const RGBA = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/;

function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = hex[1];
    return {
      rgb: [0, 2, 4].map((i) => parseInt(n.substring(i, i + 2), 16)) as Rgb,
      alpha: 1,
    };
  }
  const m = RGBA.exec(value);
  if (m) {
    return {
      rgb: [Number(m[1]), Number(m[2]), Number(m[3])],
      alpha: m[4] === undefined ? 1 : Number(m[4]),
    };
  }
  throw new Error(`Unsupported colour format: ${value}`);
}

/** Convert a colour to opaque RGB, compositing any alpha over `over` (a hex or rgba colour). */
function toRgb(value: string, over?: string): Rgb {
  const { rgb, alpha } = parseColor(value);
  if (alpha === 1) return rgb;
  if (!over) throw new Error(`rgba colour needs a surface to composite over: ${value}`);
  const base = toRgb(over);
  return rgb.map((c, i) => c * alpha + base[i] * (1 - alpha)) as Rgb;
}

function luminanceOf([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
}

/** WCAG contrast of fg on bg. rgba bg composites over `under`; rgba fg composites over the resulting bg. */
function contrast(fg: string, bg: string, under: string): number {
  const bgRgb = toRgb(bg, under);
  const bgHex = `rgb(${bgRgb.join(",")})`;
  const fgRgb = toRgb(fg, bgHex);
  const l1 = luminanceOf(fgRgb);
  const l2 = luminanceOf(bgRgb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function pairContrast(pair: Pair, theme: Theme): number {
  const under = resolveColor(pair.under ?? "surface.card", theme);
  return contrast(resolveColor(pair.fg, theme), resolveColor(pair.bg, theme), under);
}

function label(pair: Pair, theme: Theme): string {
  return `${pair.fg} on ${pair.bg} >= ${pair.min} (${pair.role}, ${theme})`;
}

function assertPair(pair: Pair) {
  for (const theme of pair.themes) {
    const ratio = pairContrast(pair, theme);
    expect(ratio, label(pair, theme)).toBeGreaterThanOrEqual(pair.min);
  }
}

const BOTH: Theme[] = ["light", "dark"];
const SURFACES = ["DEFAULT", "canvas", "card", "sunken", "subtle", "overlay"].map(
  (s) => `surface.${s}`,
);
const TEXTS = ["primary", "secondary", "muted"].map((t) => `text.${t}`);
const STATUSES = ["positive", "warning", "danger", "info", "neutral"];
const CHART_SERIES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `chart.series${n}`);
const CHART_LINES = [
  "chart.primary",
  "chart.wealth",
  "chart.debt",
  "chart.warning",
  "chart.accentPurple",
  "chart.accentCyan",
  "chart.projection",
  "chart.baseline",
  ...CHART_SERIES,
];

const PASSING_PAIRS: Pair[] = [
  ...TEXTS.flatMap((fg) =>
    SURFACES.map((bg): Pair => ({ fg, bg, themes: BOTH, min: 4.5, role: "text" })),
  ),
  { fg: "text.onContrast", bg: "surface.contrast", themes: BOTH, min: 4.5, role: "text" },
  ...STATUSES.flatMap((s) => [
    { fg: `status.${s}.text`, bg: `status.${s}.bg`, themes: BOTH, min: 4.5, role: "text" } as Pair,
    { fg: `status.${s}.text`, bg: "surface.card", themes: BOTH, min: 4.5, role: "text" } as Pair,
  ]),
  ...["surface.card", "surface.canvas"].map(
    (bg): Pair => ({ fg: "border.focusRing", bg, themes: BOTH, min: 3, role: "ui" }),
  ),
  // J-06 (E8 T03): form-control boundaries need 3:1 against every surface they sit on.
  ...["surface.card", "surface.canvas", "surface.sunken", "surface.overlay", "surface.subtle"].map(
    (bg): Pair => ({ fg: "border.input", bg, themes: BOTH, min: 3, role: "ui" }),
  ),
  // J-01/H-07/chart-warning (E8 T05): status fills and chart warning series are graphics (SC 1.4.11, 3:1).
  ...STATUSES.map(
    (s): Pair => ({
      fg: `status.${s}.solid`,
      bg: "surface.card",
      themes: BOTH,
      min: 3,
      role: "graphic",
    }),
  ),
  { fg: "text.onContrast", bg: "status.danger.solid", themes: BOTH, min: 4.5, role: "text" },
  // E15 T1: every chart series/accent and the reference lines reach 3:1 on the two chart surfaces
  // in both themes (SC 1.4.11). Light also clears sunken/subtle now that warning/series5 changed.
  ...CHART_LINES.flatMap((fg) =>
    ["surface.card", "surface.canvas"].map(
      (bg): Pair => ({ fg, bg, themes: BOTH, min: 3, role: "graphic" }),
    ),
  ),
  ...[...CHART_SERIES, "chart.baseline"].flatMap((fg) =>
    ["surface.sunken", "surface.subtle", "surface.overlay"].map(
      (bg): Pair => ({ fg, bg, themes: BOTH, min: 3, role: "graphic" }),
    ),
  ),
  // E15 T1: text on every status fill and status text on every page surface.
  ...STATUSES.flatMap((s) =>
    ["surface.canvas", "surface.sunken", "surface.subtle", "surface.overlay"].map(
      (bg): Pair => ({ fg: `status.${s}.text`, bg, themes: BOTH, min: 4.5, role: "text" }),
    ),
  ),
  ...STATUSES.flatMap((s) =>
    ["text.primary", "text.secondary"].map(
      (fg): Pair => ({ fg, bg: `status.${s}.bg`, themes: BOTH, min: 4.5, role: "text" }),
    ),
  ),
  { fg: "text.primary", bg: "primary.subtle", themes: BOTH, min: 4.5, role: "text" },
  { fg: "text.secondary", bg: "primary.subtle", themes: BOTH, min: 4.5, role: "text" },
  // J-01 (E8 T06, D1 option A): primary stays the accent (text/graphic); primary.solid and
  // primary.hover are fills behind primary.foreground (text-labelled fills only).
  ...["primary.solid", "primary.hover"].map(
    (bg): Pair => ({ fg: "primary.foreground", bg, themes: BOTH, min: 4.5, role: "text" }),
  ),
  ...[...SURFACES.filter((s) => s !== "surface.DEFAULT"), "primary.subtle"].map(
    (bg): Pair => ({
      fg: "primary",
      bg,
      themes: BOTH,
      min: 4.5,
      role: "text",
      under: "surface.card",
    }),
  ),
  { fg: "primary", bg: "surface.card", themes: BOTH, min: 3, role: "graphic" },
];

/** Known failures. Each row names the audit finding; fix the token then move the row to PASSING_PAIRS. */
const KNOWN_FAILURES: { finding: string; pair: Pair }[] = [
  // E15 T1 closed the E8 light sunken/subtle gap (chart.warning/series5 now pass on every surface),
  // so there are no known failures. Add a row here before shipping any token that cannot yet pass.
];

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
    expect(resolveColor("surface.card", "dark").toLowerCase()).toBe("#131a2c");
    expect(resolveColor("surface.card", "light")).toBe("#ffffff");
    expect(resolveColor("primary", "light")).toBe(colors.indigo[600].value);
    expect(resolveColor("border", "light")).toBe(colors.ink[250].value);
    expect(resolveColor("border.input", "light")).toBe(colors.ink[500].value);
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
    // Before the split, dark primary was indigo.500: foreground on it was < 4.5.
    expect(r("primary.foreground", "primary.solid", "dark")).toBeGreaterThanOrEqual(6.2);
    expect(r("primary.foreground", "primary.hover", "dark")).toBeGreaterThanOrEqual(7.8);
    expect(r("primary", "surface.card", "dark")).toBeGreaterThanOrEqual(5.8);
    // solid is deliberately identical in both themes (white label keeps AA).
    expect(resolveColor("primary.solid", "dark")).toBe(resolveColor("primary.solid", "light"));
    expect(resolveColor("primary", "dark")).toBe(colors.dark.primary.value);
  });

  // Generated output is gitignored; skipped when `bun run generate` has not run.
  const generatedTokens = new URL("../../styled-system/tokens/index.js", import.meta.url);
  it.skipIf(!existsSync(generatedTokens))("panda codegen emits primary.solid", () => {
    expect(readFileSync(generatedTokens, "utf8")).toContain('"colors.primary.solid"');
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

  it("uses amber, not red, for liabilities (chart.debt hue 30-50 degrees)", () => {
    for (const theme of BOTH) {
      const [r, g, b] = toRgb(resolveColor("chart.debt", theme));
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const hue = (60 * (g - b)) / (max - min);
      expect(hue).toBeGreaterThan(30);
      expect(hue).toBeLessThan(50);
    }
  });
});

describe("E15 new colour keys exist with light and dark values", () => {
  it.each([
    "surface.scrim",
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
