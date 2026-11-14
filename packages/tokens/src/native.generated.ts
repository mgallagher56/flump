/**
 * Flump native theme: generated, do not edit.
 *
 * Source: packages/tokens/src (the same tokens the Panda preset reads).
 * Regenerate: bun run --cwd packages/tokens generate:tokens
 * Rules: docs/ux/CROSS-PLATFORM.md section 2. Comfortable density only.
 */

export type ColorKey =
  | "border"
  | "border.focusRing"
  | "border.input"
  | "border.strong"
  | "border.subtle"
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
  | "primary.foreground"
  | "primary.hover"
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
  | "surface.tint.sage"
  | "surface.tint.teal"
  | "text.muted"
  | "text.onContrast"
  | "text.primary"
  | "text.secondary";

export type ShadowKey = "card" | "focus" | "overlay" | "raised" | "xs";

export interface NativeTheme {
  readonly colors: Readonly<Record<ColorKey, string>>;
  readonly shadows: Readonly<Record<ShadowKey, string>>;
}

export const light: NativeTheme = {
  colors: {
    border: "#dcd4c8",
    "border.focusRing": "#0f6b5e",
    "border.input": "#867c6e",
    "border.strong": "#b5ab9c",
    "border.subtle": "#e8e1d6",
    "chart.accentCyan": "#2f7fa0",
    "chart.accentPurple": "#7e67a8",
    "chart.band": "rgba(15, 107, 94, 0.14)",
    "chart.baseline": "#867c6e",
    "chart.debt": "#c26a18",
    "chart.grid": "rgba(43, 38, 32, 0.08)",
    "chart.primary": "#0f6b5e",
    "chart.projection": "#6b3f2a",
    "chart.series1": "#0f6b5e",
    "chart.series2": "#64885c",
    "chart.series3": "#c26a18",
    "chart.series4": "#7e67a8",
    "chart.series5": "#b03f6a",
    "chart.series6": "#2f7fa0",
    "chart.series7": "#94750f",
    "chart.series8": "#7a7064",
    "chart.warning": "#94750f",
    "chart.wealth": "#64885c",
    primary: "#0f6b5e",
    "primary.border": "#9ccfc2",
    "primary.foreground": "#ffffff",
    "primary.hover": "#0a564b",
    "primary.solid": "#0f6b5e",
    "primary.subtle": "#e1f0eb",
    "status.danger.bg": "#fbe5e0",
    "status.danger.border": "#e8b0a4",
    "status.danger.solid": "#b64030",
    "status.danger.text": "#a13a2b",
    "status.info.bg": "#eef0ff",
    "status.info.border": "#c7c9f7",
    "status.info.solid": "#4f46e5",
    "status.info.text": "#3730a3",
    "status.neutral.bg": "#ece6dc",
    "status.neutral.border": "#c9c0b2",
    "status.neutral.solid": "#766c5f",
    "status.neutral.text": "#564f46",
    "status.positive.bg": "#eaf3da",
    "status.positive.border": "#bcd68f",
    "status.positive.solid": "#3a5c08",
    "status.positive.text": "#3e6b12",
    "status.warning.bg": "#fcebd2",
    "status.warning.border": "#ebc38a",
    "status.warning.solid": "#b06a10",
    "status.warning.text": "#8a4a08",
    surface: "#fffdf9",
    "surface.canvas": "#f5f1ea",
    "surface.card": "#fffdf9",
    "surface.contrast": "#22302c",
    "surface.hero": "#12483f",
    "surface.overlay": "#ffffff",
    "surface.scrim": "rgba(43, 38, 32, 0.4)",
    "surface.subtle": "#f0ebe2",
    "surface.sunken": "#eae3d8",
    "surface.tint.apricot": "#fae5cc",
    "surface.tint.sage": "#e5edda",
    "surface.tint.teal": "#dcede6",
    "text.muted": "#6a6258",
    "text.onContrast": "#f6f1e8",
    "text.primary": "#2b2620",
    "text.secondary": "#564f46",
  },
  shadows: {
    card: "0 1px 2px rgba(43, 38, 32, 0.08), 0 4px 14px rgba(43, 38, 32, 0.07)",
    focus: "0 0 0 2px #fffdf9, 0 0 0 4px #0f6b5e",
    overlay: "0 12px 32px -4px rgba(43, 38, 32, 0.16), 0 4px 8px -2px rgba(43, 38, 32, 0.08)",
    raised: "0 2px 8px -2px rgba(43, 38, 32, 0.12), 0 1px 2px rgba(43, 38, 32, 0.06)",
    xs: "0 1px 2px rgba(43, 38, 32, 0.07)",
  },
};

export const dark: NativeTheme = {
  colors: {
    border: "#3b362f",
    "border.focusRing": "#6fd0ba",
    "border.input": "#8f8678",
    "border.strong": "#5c554a",
    "border.subtle": "#302c27",
    "chart.accentCyan": "#6db5d6",
    "chart.accentPurple": "#a98fe0",
    "chart.band": "rgba(92, 196, 174, 0.15)",
    "chart.baseline": "#8f8678",
    "chart.debt": "#eda45f",
    "chart.grid": "rgba(244, 239, 231, 0.08)",
    "chart.primary": "#5cc4ae",
    "chart.projection": "#ffd2a8",
    "chart.series1": "#5cc4ae",
    "chart.series2": "#9ad0a0",
    "chart.series3": "#eda45f",
    "chart.series4": "#a98fe0",
    "chart.series5": "#e58aa2",
    "chart.series6": "#6db5d6",
    "chart.series7": "#e3b452",
    "chart.series8": "#a59d90",
    "chart.warning": "#e3b452",
    "chart.wealth": "#9ad0a0",
    primary: "#6fd0ba",
    "primary.border": "#2e6055",
    "primary.foreground": "#ffffff",
    "primary.hover": "#0a564b",
    "primary.solid": "#0f6b5e",
    "primary.subtle": "#1e3b35",
    "status.danger.bg": "#3d221d",
    "status.danger.border": "#74403a",
    "status.danger.solid": "#be5337",
    "status.danger.text": "#f4a593",
    "status.info.bg": "#1b1e4a",
    "status.info.border": "#3b3f8f",
    "status.info.solid": "#8f92ff",
    "status.info.text": "#a5a8ff",
    "status.neutral.bg": "#2e2a26",
    "status.neutral.border": "#4a443b",
    "status.neutral.solid": "#a59d90",
    "status.neutral.text": "#cbc3b7",
    "status.positive.bg": "#1d3a22",
    "status.positive.border": "#34603a",
    "status.positive.solid": "#c5de4c",
    "status.positive.text": "#a8d86a",
    "status.warning.bg": "#3b2c16",
    "status.warning.border": "#6b4b1e",
    "status.warning.solid": "#e0a04a",
    "status.warning.text": "#f2b873",
    surface: "#272320",
    "surface.canvas": "#1d1a17",
    "surface.card": "#272320",
    "surface.contrast": "#3a352f",
    "surface.hero": "#1b5448",
    "surface.overlay": "#36322d",
    "surface.scrim": "rgba(8, 6, 4, 0.6)",
    "surface.subtle": "#2e2a26",
    "surface.sunken": "#171412",
    "surface.tint.apricot": "#2e261c",
    "surface.tint.sage": "#272f22",
    "surface.tint.teal": "#1f322d",
    "text.muted": "#a59d90",
    "text.onContrast": "#fffdf9",
    "text.primary": "#f4efe7",
    "text.secondary": "#cbc3b7",
  },
  shadows: {
    card: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 1px 2px rgba(0, 0, 0, 0.2)",
    focus: "0 0 0 2px #272320, 0 0 0 4px #6fd0ba",
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
  "page.section": 32,
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
  fast: 120,
  instant: 0,
  loop: 800,
  pendingDelay: 200,
  pendingMinimum: 400,
  reveal: 150,
  slow: 320,
} as const;

export const easings = {
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
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
