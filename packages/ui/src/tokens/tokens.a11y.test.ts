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
  ...["chart.warning", "chart.series5"].flatMap((fg) =>
    ["surface.card", "surface.canvas"].map(
      (bg): Pair => ({ fg, bg, themes: BOTH, min: 3, role: "graphic" }),
    ),
  ),
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
  // Light chart.warning/series5 (warning.600) pass 3:1 on card (3.19) and canvas (3.04) but only
  // reach ~2.91 on the sunken and subtle surfaces. Known gap: charts must not sit on these surfaces
  // until the series colour is revisited (E14).
  ...["chart.warning", "chart.series5"].flatMap((fg) =>
    ["surface.sunken", "surface.subtle"].map((bg) => ({
      finding: "E8-chart-warning-light-sunken",
      pair: { fg, bg, themes: ["light"], min: 3, role: "graphic" } as Pair,
    })),
  ),
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
    expect(resolveColor("surface.card", "dark").toLowerCase()).toBe("#141a26");
    expect(resolveColor("surface.card", "light")).toBe("#ffffff");
    expect(resolveColor("primary", "light")).toBe(colors.indigo[600].value);
    expect(resolveColor("border", "light")).toBe(colors.slate[200].value);
    expect(resolveColor("border.input", "light")).toBe(colors.slate[500].value);
    expect(resolveColor("border.input", "dark")).toBe("rgba(255, 255, 255, 0.40)");
  });

  it("resolveColor throws on unresolved tokens and references", () => {
    expect(() => resolveColor("surface.nope", "light")).toThrow(/Unresolved/);
    expect(() => resolveColor("status", "light")).toThrow(/DEFAULT/);
    expect(() => resolveRaw("{colors.nope.500}", "light", [])).toThrow(/Unresolved/);
  });

  it("composites rgba over the surface it sits on", () => {
    const surface = resolveColor("surface.card", "dark");
    const ratio = contrast(resolveColor("border.strong", "dark"), surface, surface);
    expect(ratio).toBeCloseTo(1.64, 2);
    // Compositing over a different surface gives a different answer (not over white or black only).
    const onCanvas = contrast(
      resolveColor("border.strong", "dark"),
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
    expect(resolveColor("primary", "dark")).toBe(colors.indigo[400].value);
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
