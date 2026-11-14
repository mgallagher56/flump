/**
 * The semantic colour contrast matrix and the WCAG maths behind it, shared by the authored-token
 * test (tokens.a11y.test.ts) and the generated native theme test (native.contrast.test.ts), so one
 * list of pairs guards both outputs. Not part of the package's public exports.
 *
 * A pair names two semantic paths (`border` is `border.DEFAULT`), the themes it applies to, the
 * minimum ratio and its role: "text" (SC 1.4.3, 4.5:1), "ui" boundaries and "graphic" marks
 * (SC 1.4.11, 3:1). Rows that fail today go in KNOWN_FAILURES with a finding id.
 */

export type Theme = "light" | "dark";
export type Rgb = [number, number, number];
export type Role = "text" | "ui" | "graphic";

export interface Pair {
  fg: string;
  bg: string;
  themes: Theme[];
  min: 4.5 | 3 | 1.5;
  role: Role;
  /** Surface that an rgba bg (or fg) is composited over. Defaults to surface.card. */
  under?: string;
}

const RGBA = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/;

export function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1];
  if (hex) {
    return {
      rgb: [0, 2, 4].map((i) => Number.parseInt(hex.substring(i, i + 2), 16)) as Rgb,
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
export function toRgb(value: string, over?: string): Rgb {
  const { rgb, alpha } = parseColor(value);
  if (alpha === 1) return rgb;
  if (!over) throw new Error(`rgba colour needs a surface to composite over: ${value}`);
  const base = toRgb(over);
  return rgb.map((c, i) => c * alpha + base[i as 0 | 1 | 2] * (1 - alpha)) as Rgb;
}

export function luminanceOf(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

/** WCAG contrast of fg on bg. rgba bg composites over `under`; rgba fg composites over the resulting bg. */
export function contrast(fg: string, bg: string, under: string): number {
  const bgRgb = toRgb(bg, under);
  const fgRgb = toRgb(fg, `rgb(${bgRgb.join(",")})`);
  const l1 = luminanceOf(fgRgb);
  const l2 = luminanceOf(bgRgb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Contrast of a pair, given a resolver from a semantic path to a colour for a theme. */
export function pairContrast(
  pair: Pair,
  theme: Theme,
  resolveColor: (path: string, theme: Theme) => string,
): number {
  const under = resolveColor(pair.under ?? "surface.card", theme);
  return contrast(resolveColor(pair.fg, theme), resolveColor(pair.bg, theme), under);
}

export function pairLabel(pair: Pair, theme: Theme): string {
  return `${pair.fg} on ${pair.bg} >= ${pair.min} (${pair.role}, ${theme})`;
}

export const BOTH: Theme[] = ["light", "dark"];
export const SURFACES = ["DEFAULT", "canvas", "card", "sunken", "subtle", "overlay"].map(
  (s) => `surface.${s}`,
);
export const TEXTS = ["primary", "secondary", "muted"].map((t) => `text.${t}`);
export const STATUSES = ["positive", "warning", "danger", "info", "neutral"];
export const CHART_SERIES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `chart.series${n}`);
export const CHART_LINES = [
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

/**
 * Which status fills may carry primary.foreground (white) text, per theme. Measured ratios are in
 * docs/design/e15/tokens.md. Everything not listed here is forbidden and asserted in the tests.
 */
export const PRIMARY_FOREGROUND_OK: Record<string, Theme[]> = {
  positive: ["light"],
  warning: [],
  danger: ["light", "dark"],
  info: ["light"],
  neutral: ["light"],
};

export const PASSING_PAIRS: Pair[] = [
  ...TEXTS.flatMap((fg) =>
    SURFACES.map((bg): Pair => ({ fg, bg, themes: BOTH, min: 4.5, role: "text" })),
  ),
  { fg: "text.onContrast", bg: "surface.contrast", themes: BOTH, min: 4.5, role: "text" },
  // Round 5: the deep-teal hero block carries text.onContrast, and stays a visible block on every
  // page surface (graphic, 1.4.11 does not apply to a fill, but 3:1 keeps it unmistakable).
  { fg: "text.onContrast", bg: "surface.hero", themes: BOTH, min: 4.5, role: "text" },
  // Focus ring on the hero block (KpiCard tone="hero"): the teal ring only clears 3:1 in dark, so
  // hero descendants switch to a text.onContrast outline (see KpiCard.styles.ts).
  { fg: "border.focusRing", bg: "surface.hero", themes: ["dark"], min: 3, role: "ui" },
  { fg: "text.onContrast", bg: "surface.hero", themes: BOTH, min: 3, role: "ui" },
  ...["surface.canvas", "surface.card"].map(
    (bg): Pair => ({ fg: "surface.hero", bg, themes: BOTH, min: 1.5, role: "graphic" }),
  ),
  // Round 5: the dark accent (primary DEFAULT) is a text colour on the hero block too.
  { fg: "primary", bg: "surface.hero", themes: ["dark"], min: 3, role: "graphic" },
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
  // Review follow-up: muted text on a status badge fill (bg is rgba, composited under surface.card).
  ...STATUSES.map(
    (s): Pair => ({
      fg: "text.muted",
      bg: `status.${s}.bg`,
      themes: BOTH,
      min: 4.5,
      role: "text",
      under: "surface.card",
    }),
  ),
  // Status fills are graphics (3:1) on every page surface, not only the card.
  ...STATUSES.flatMap((s) =>
    ["surface.canvas", "surface.sunken", "surface.subtle"].map(
      (bg): Pair => ({ fg: `status.${s}.solid`, bg, themes: BOTH, min: 3, role: "graphic" }),
    ),
  ),
  // The focus ring is a UI component indicator (3:1) on the recessed and raised surfaces too.
  ...["surface.sunken", "surface.subtle", "surface.overlay"].map(
    (bg): Pair => ({ fg: "border.focusRing", bg, themes: BOTH, min: 3, role: "ui" }),
  ),
  // primary.foreground (white) on a status fill: only the fills in PRIMARY_FOREGROUND_OK.
  ...Object.entries(PRIMARY_FOREGROUND_OK).flatMap(([s, themes]) =>
    themes.length
      ? [
          {
            fg: "primary.foreground",
            bg: `status.${s}.solid`,
            themes,
            min: 4.5,
            role: "text",
          } as Pair,
        ]
      : [],
  ),
];

/** Known failures. Each row names the audit finding; fix the token then move the row to PASSING_PAIRS. */
export const KNOWN_FAILURES: { finding: string; pair: Pair }[] = [
  // E15 T1 closed the E8 light sunken/subtle gap (chart.warning/series5 now pass on every surface),
  // so there are no known failures. Add a row here before shipping any token that cannot yet pass.
];
