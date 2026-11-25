/**
 * Flump native theme: generated, do not edit.
 *
 * Source: packages/tokens/src (the same tokens the Panda preset reads).
 * Regenerate: bun run --cwd packages/tokens generate:tokens
 * Rules: docs/ux/CROSS-PLATFORM.md section 2. Comfortable density only.
 */

export type ColorKey =
  | "accent"
  | "accent.border"
  | "accent.onHero"
  | "accent.subtle"
  | "border"
  | "border.focusRing"
  | "border.hero"
  | "border.input"
  | "border.section"
  | "border.strong"
  | "border.subtle"
  | "chart.accent"
  | "chart.accentCyan"
  | "chart.accentPurple"
  | "chart.band"
  | "chart.baseline"
  | "chart.debt"
  | "chart.grid"
  | "chart.primary"
  | "chart.projection"
  | "chart.series1"
  | "chart.series2"
  | "chart.series3"
  | "chart.series4"
  | "chart.series5"
  | "chart.series6"
  | "chart.series7"
  | "chart.series8"
  | "chart.warning"
  | "chart.wealth"
  | "primary"
  | "primary.border"
  | "primary.emphasis"
  | "primary.foreground"
  | "primary.hover"
  | "primary.mark"
  | "primary.markLit"
  | "primary.solid"
  | "primary.subtle"
  | "status.danger.bg"
  | "status.danger.border"
  | "status.danger.solid"
  | "status.danger.text"
  | "status.info.bg"
  | "status.info.border"
  | "status.info.solid"
  | "status.info.text"
  | "status.neutral.bg"
  | "status.neutral.border"
  | "status.neutral.solid"
  | "status.neutral.text"
  | "status.positive.bg"
  | "status.positive.border"
  | "status.positive.solid"
  | "status.positive.text"
  | "status.warning.bg"
  | "status.warning.border"
  | "status.warning.solid"
  | "status.warning.text"
  | "surface"
  | "surface.canvas"
  | "surface.card"
  | "surface.contrast"
  | "surface.hero"
  | "surface.overlay"
  | "surface.scrim"
  | "surface.subtle"
  | "surface.sunken"
  | "surface.tint.apricot"
  | "surface.tint.rose"
  | "surface.tint.sage"
  | "surface.tint.sky"
  | "surface.tint.teal"
  | "surface.tint.violet"
  | "text.heroFigure"
  | "text.muted"
  | "text.onContrast"
  | "text.onHero"
  | "text.primary"
  | "text.secondary";

export type ShadowKey = "card" | "focus" | "overlay" | "raised" | "xs";

export interface NativeTheme {
  readonly colors: Readonly<Record<ColorKey, string>>;
  readonly shadows: Readonly<Record<ShadowKey, string>>;
}

export const light: NativeTheme = {
  colors: {
    accent: "#1d5f73",
    "accent.border": "#a9c6be",
    "accent.onHero": "#0b6b5d",
    "accent.subtle": "#d2eef0",
    border: "#c8dcd5",
    "border.focusRing": "#0b6b5d",
    "border.hero": "#6fd0ba",
    "border.input": "#5e837a",
    "border.section": "#0f2a2a",
    "border.strong": "#678a82",
    "border.subtle": "#d5e5e0",
    "chart.accent": "#1d5f73",
    "chart.accentCyan": "#2f7fa0",
    "chart.accentPurple": "#7e67a8",
    "chart.band": "rgba(11, 107, 93, 0.14)",
    "chart.baseline": "#5e837a",
    "chart.debt": "#c26a18",
    "chart.grid": "rgba(15, 42, 42, 0.08)",
    "chart.primary": "#0b6b5d",
    "chart.projection": "#6b3f2a",
    "chart.series1": "#0b6b5d",
    "chart.series2": "#64885c",
    "chart.series3": "#c26a18",
    "chart.series4": "#7e67a8",
    "chart.series5": "#b03f6a",
    "chart.series6": "#2f7fa0",
    "chart.series7": "#94750f",
    "chart.series8": "#5f7470",
    "chart.warning": "#94750f",
    "chart.wealth": "#64885c",
    primary: "#0b6b5d",
    "primary.border": "#5a8f83",
    "primary.emphasis": "#084f45",
    "primary.foreground": "#f8fcfa",
    "primary.hover": "#2c323b",
    "primary.mark": "#084f45",
    "primary.markLit": "#0b6b5d",
    "primary.solid": "#14171c",
    "primary.subtle": "#cfe9e2",
    "status.danger.bg": "#fbe5e0",
    "status.danger.border": "#e8b0a4",
    "status.danger.solid": "#b64030",
    "status.danger.text": "#a13a2b",
    "status.info.bg": "#eef0ff",
    "status.info.border": "#c7c9f7",
    "status.info.solid": "#4f46e5",
    "status.info.text": "#3730a3",
    "status.neutral.bg": "#dbe9e5",
    "status.neutral.border": "#a9c6be",
    "status.neutral.solid": "#5a716d",
    "status.neutral.text": "#2f4a4a",
    "status.positive.bg": "#eaf3da",
    "status.positive.border": "#bcd68f",
    "status.positive.solid": "#3a5c08",
    "status.positive.text": "#3e6b12",
    "status.warning.bg": "#fcebd2",
    "status.warning.border": "#ebc38a",
    "status.warning.solid": "#b06a10",
    "status.warning.text": "#8a4a08",
    surface: "#f8fcfa",
    "surface.canvas": "#eef6f3",
    "surface.card": "#f8fcfa",
    "surface.contrast": "#14171c",
    "surface.hero": "#6fd0ba",
    "surface.overlay": "#f6f7f7",
    "surface.scrim": "rgba(15, 42, 42, 0.4)",
    "surface.subtle": "#e7f2ee",
    "surface.sunken": "#dfeee9",
    "surface.tint.apricot": "#fae5cc",
    "surface.tint.rose": "#f3e3ea",
    "surface.tint.sage": "#e1edd6",
    "surface.tint.sky": "#d8e8f2",
    "surface.tint.teal": "#c6e6dc",
    "surface.tint.violet": "#e3e0f4",
    "text.heroFigure": "#0f2a2a",
    "text.muted": "#476060",
    "text.onContrast": "#f8fcfa",
    "text.onHero": "#0f2a2a",
    "text.primary": "#0f2a2a",
    "text.secondary": "#2f4a4a",
  },
  shadows: {
    card: "0 1px 2px rgba(15, 42, 42, 0.08), 0 4px 14px rgba(15, 42, 42, 0.07)",
    focus: "0 0 0 2px #f8fcfa, 0 0 0 4px #0b6b5d",
    overlay: "0 12px 32px -4px rgba(15, 42, 42, 0.16), 0 4px 8px -2px rgba(15, 42, 42, 0.08)",
    raised: "0 2px 8px -2px rgba(15, 42, 42, 0.12), 0 1px 2px rgba(15, 42, 42, 0.06)",
    xs: "0 1px 2px rgba(15, 42, 42, 0.07)",
  },
};

export const dark: NativeTheme = {
  colors: {
    accent: "#e3b5d1",
    "accent.border": "#5a4655",
    "accent.onHero": "#e3b5d1",
    "accent.subtle": "#2f2733",
    border: "#303740",
    "border.focusRing": "#6fd0ba",
    "border.hero": "#3a424e",
    "border.input": "#737c88",
    "border.section": "#737c88",
    "border.strong": "#7a8390",
    "border.subtle": "#242931",
    "chart.accent": "#e3b5d1",
    "chart.accentCyan": "#6db5d6",
    "chart.accentPurple": "#a98fe0",
    "chart.band": "rgba(111, 208, 186, 0.15)",
    "chart.baseline": "#737c88",
    "chart.debt": "#eda45f",
    "chart.grid": "rgba(241, 238, 232, 0.08)",
    "chart.primary": "#6fd0ba",
    "chart.projection": "#ffd2a8",
    "chart.series1": "#6fd0ba",
    "chart.series2": "#9ad0a0",
    "chart.series3": "#eda45f",
    "chart.series4": "#a98fe0",
    "chart.series5": "#e58aa2",
    "chart.series6": "#6db5d6",
    "chart.series7": "#e3b452",
    "chart.series8": "#a9afb9",
    "chart.warning": "#e3b452",
    "chart.wealth": "#9ad0a0",
    primary: "#6fd0ba",
    "primary.border": "#53877d",
    "primary.emphasis": "#9be3d2",
    "primary.foreground": "#0e1a17",
    "primary.hover": "#9be3d2",
    "primary.mark": "#6fd0ba",
    "primary.markLit": "#9be3d2",
    "primary.solid": "#6fd0ba",
    "primary.subtle": "#1f3532",
    "status.danger.bg": "#3b2320",
    "status.danger.border": "#74403a",
    "status.danger.solid": "#be5337",
    "status.danger.text": "#f4a593",
    "status.info.bg": "#1b1e4a",
    "status.info.border": "#3b3f8f",
    "status.info.solid": "#8f92ff",
    "status.info.text": "#a5a8ff",
    "status.neutral.bg": "#262b33",
    "status.neutral.border": "#46505c",
    "status.neutral.solid": "#a9afb9",
    "status.neutral.text": "#cdd1d7",
    "status.positive.bg": "#1f3622",
    "status.positive.border": "#3a6340",
    "status.positive.solid": "#c5de4c",
    "status.positive.text": "#a8d86a",
    "status.warning.bg": "#382b18",
    "status.warning.border": "#6b4b1e",
    "status.warning.solid": "#e0a04a",
    "status.warning.text": "#f2b873",
    surface: "#1d2128",
    "surface.canvas": "#14171c",
    "surface.card": "#1d2128",
    "surface.contrast": "#0f1216",
    "surface.hero": "#1d2128",
    "surface.overlay": "#2a3039",
    "surface.scrim": "rgba(5, 7, 9, 0.6)",
    "surface.subtle": "#262b33",
    "surface.sunken": "#0f1216",
    "surface.tint.apricot": "#42311c",
    "surface.tint.rose": "#4d2939",
    "surface.tint.sage": "#2b3822",
    "surface.tint.sky": "#1d3846",
    "surface.tint.teal": "#1d3934",
    "surface.tint.violet": "#353050",
    "text.heroFigure": "#6fd0ba",
    "text.muted": "#a9afb9",
    "text.onContrast": "#f8fcfa",
    "text.onHero": "#f1eee8",
    "text.primary": "#f1eee8",
    "text.secondary": "#cdd1d7",
  },
  shadows: {
    card: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 1px 2px rgba(0, 0, 0, 0.2)",
    focus: "0 0 0 2px #1d2128, 0 0 0 4px #6fd0ba",
    overlay:
      "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 8px 24px rgba(0, 0, 0, 0.3)",
    raised:
      "inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 4px 12px rgba(0, 0, 0, 0.24)",
    xs: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.05)",
  },
};

export const spacing = {
  "0": 0,
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "10": 40,
  "12": 48,
  "16": 64,
  "20": 80,
  "24": 96,
  "32": 128,
  "density.cardPad": 20,
  "density.controlPadX": 14,
  "density.controlPadY": 10,
  "density.gap": 16,
  "density.rowPadY": 12,
  "page.gutter.lg": 40,
  "page.gutter.md": 24,
  "page.gutter.sm": 16,
  "page.section": 36,
  "page.top.lg": 32,
  "page.top.sm": 20,
} as const;

export const radii = {
  "2xl": 24,
  card: 16,
  control: 8,
  full: 9999,
  lg: 12,
  md: 8,
  none: 0,
  sm: 6,
  tray: 24,
  xl: 16,
  xs: 4,
} as const;

export const sizes = {
  "control.lg": 48,
  "control.md": 40,
  "control.sm": 32,
  "density.control.lg": 48,
  "density.control.md": 40,
  "density.control.sm": 32,
  "page.max": 1200,
  touch: 44,
} as const;

export const fontSizes = {
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
  lg: 18,
  md: 16,
  sm: 14,
  xl: 20,
  xs: 12,
} as const;

export const textStyles = {
  "body.lg": {
    fontFamily: "body",
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 28.8,
    letterSpacing: 0,
  },
  "body.md": {
    fontFamily: "body",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    letterSpacing: 0,
  },
  "body.sm": {
    fontFamily: "body",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 21,
    letterSpacing: 0,
  },
  display: {
    fontFamily: "heading",
    fontSize: {
      min: 32,
      max: 48,
    },
    fontWeight: "700",
    lineHeight: {
      min: 38.4,
      max: 57.6,
    },
    letterSpacing: {
      min: -0.64,
      max: -0.96,
    },
  },
  "heading.lg": {
    fontFamily: "heading",
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 28.6,
    letterSpacing: -0.22,
  },
  "heading.md": {
    fontFamily: "heading",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 23.4,
    letterSpacing: -0.18,
  },
  "heading.sm": {
    fontFamily: "heading",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22.4,
    letterSpacing: 0,
  },
  "heading.xl": {
    fontFamily: "heading",
    fontSize: {
      min: 24,
      max: 32,
    },
    fontWeight: "700",
    lineHeight: {
      min: 28.8,
      max: 38.4,
    },
    letterSpacing: {
      min: -0.48,
      max: -0.64,
    },
  },
  "label.md": {
    fontFamily: "body",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19.6,
    letterSpacing: 0,
  },
  "label.sm": {
    fontFamily: "body",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16.8,
    letterSpacing: 0,
  },
  "numeric.hero": {
    fontFamily: "body",
    fontSize: {
      min: 36,
      max: 48,
    },
    fontWeight: "700",
    lineHeight: {
      min: 43.2,
      max: 57.6,
    },
    letterSpacing: {
      min: -0.72,
      max: -0.96,
    },
    fontVariant: ["tabular-nums"],
  },
  "numeric.kpi": {
    fontFamily: "body",
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 38.4,
    letterSpacing: -0.64,
    fontVariant: ["tabular-nums"],
  },
  "numeric.lg": {
    fontFamily: "body",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  "numeric.md": {
    fontFamily: "body",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22.4,
    letterSpacing: 0,
    fontVariant: ["tabular-nums"],
  },
  "numeric.result": {
    fontFamily: "body",
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 43.2,
    letterSpacing: -0.72,
    fontVariant: ["tabular-nums"],
  },
  "numeric.sm": {
    fontFamily: "body",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19.6,
    letterSpacing: 0,
    fontVariant: ["tabular-nums"],
  },
  "numeric.unset": {
    fontFamily: "body",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    letterSpacing: 0,
    fontVariant: ["tabular-nums"],
  },
} as const;

export const durations = {
  base: 200,
  draw: 600,
  fast: 120,
  instant: 0,
  loop: 800,
  pendingDelay: 200,
  pendingMinimum: 400,
  reveal: 150,
  scene: 900,
  slow: 320,
} as const;

export const easings = {
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
  settle: [0.16, 1, 0.3, 1],
  standard: [0.2, 0.6, 0.2, 1],
} as const;

export const zIndex = {
  banner: 25,
  base: 0,
  docked: 5,
  dropdown: 30,
  header: 20,
  hide: -1,
  modal: 50,
  overlay: 40,
  popover: 55,
  skipLink: 70,
  sticky: 10,
  toast: 60,
  tooltip: 65,
} as const;

export const breakpoints = {
  "2xl": 1536,
  lg: 1024,
  md: 768,
  nav: 768,
  sm: 640,
  xl: 1280,
} as const;
