import { elevationShadows } from "./elevation";
import { densityRadii, densitySizes, densitySpacing, pageSpacing } from "./layout";

export * from "./breakpoints";
export * from "./elevation";
export * from "./layout";
export * from "./motion";
export * from "./typography";

export const colors = {
  // Core Brand
  indigo: {
    50: { value: "#eef2ff" },
    100: { value: "#e0e7ff" },
    200: { value: "#c7d2fe" },
    300: { value: "#a5b4fc" },
    400: { value: "#818cf8" },
    500: { value: "#6366f1" }, // Accessible in Dark Mode
    600: { value: "#4f46e5" }, // Primary WorkOS/Stripe Indigo
    700: { value: "#4338ca" }, // Hover state
    800: { value: "#3730a3" },
    900: { value: "#312e81" },
  },
  // Surfaces & Neutrals
  slate: {
    25: { value: "#fcfcfd" },
    50: { value: "#f8fafc" },
    100: { value: "#f1f5f9" },
    200: { value: "#e2e8f0" }, // Light border
    300: { value: "#cbd5e1" },
    400: { value: "#94a3b8" }, // Accessible Muted Text (Dark)
    500: { value: "#64748b" }, // Secondary / Muted text
    600: { value: "#475569" }, // High contrast secondary
    700: { value: "#334155" },
    800: { value: "#1e293b" },
    850: { value: "#151e2e" },
    900: { value: "#0f172a" },
    950: { value: "#020617" },
  },
  // E15 round 5 (Direction C "Warm guide"): sand light neutrals, deep-teal brand, and warm-charcoal
  // dark neutrals. The semantic surface/text/border tokens map onto these. Slate stays for
  // compatibility; indigo stays for status.info only.
  sand: {
    50: { value: "#f5f1ea" }, // canvas
    100: { value: "#eae3d8" }, // sunken (mockup #ece6dc, darkened 1 step so subtle/sunken separate)
    150: { value: "#f0ebe2" }, // subtle
    200: { value: "#e8e1d6" }, // border.subtle
    250: { value: "#dcd4c8" }, // border
    300: { value: "#b5ab9c" }, // border.strong
    500: { value: "#867c6e" }, // border.input, chart.baseline (mockup #8c8274 gave 3.04:1 on the darker sunken)
    600: { value: "#6a6258" }, // text.muted
    700: { value: "#564f46" }, // text.secondary
    800: { value: "#22302c" }, // surface.contrast (deep teal-charcoal)
    900: { value: "#2b2620" }, // text.primary
  },
  // Brand teal (Direction C). 600 is the light-theme accent and the fill behind white labels in
  // both themes; 700 is its hover.
  teal: {
    600: { value: "#0f6b5e" },
    700: { value: "#0a564b" },
  },
  // Dark mode: warm charcoal (stepped surfaces: sunken < canvas < card < subtle < overlay)
  dark: {
    canvas: { value: "#1d1a17" },
    subtle: { value: "#2e2a26" },
    surface: { value: "#272320" },
    surfaceSunken: { value: "#171412" },
    surfaceOverlay: { value: "#36322d" }, // mockup #312d28 was 1.5 deltaE from subtle
    border: { value: "#3b362f" },
    borderSubtle: { value: "#302c27" },
    borderStrong: { value: "#5c554a" },
    borderInput: { value: "#8f8678" },
    contrast: { value: "#3a352f" },
    textPrimary: { value: "#f4efe7" },
    textSecondary: { value: "#cbc3b7" },
    textMuted: { value: "#a59d90" },
    primary: { value: "#6fd0ba" },
  },
  // Shared Semantic Colors (WCAG compliant)
  success: {
    50: { value: "#ecfdf5" },
    100: { value: "#d1fae5" },
    200: { value: "#a7f3d0" },
    300: { value: "#6ee7b7" },
    400: { value: "#34d399" },
    500: { value: "#10b981" },
    600: { value: "#059669" },
    700: { value: "#047857" },
    800: { value: "#065f46" },
  },
  warning: {
    50: { value: "#fffbeb" },
    100: { value: "#fef3c7" },
    200: { value: "#fde68a" },
    300: { value: "#fcd34d" },
    400: { value: "#fbbf24" },
    500: { value: "#f59e0b" },
    600: { value: "#d97706" },
    700: { value: "#b45309" },
    800: { value: "#92400e" },
  },
  info: {
    50: { value: "#f0f9ff" },
    100: { value: "#e0f2fe" },
    200: { value: "#bae6fd" },
    300: { value: "#7dd3fc" },
    400: { value: "#38bdf8" },
    500: { value: "#0ea5e9" },
    600: { value: "#0284c7" },
    700: { value: "#0369a1" },
    800: { value: "#075985" },
  },
  destructive: {
    50: { value: "#fef2f2" },
    100: { value: "#fee2e2" },
    200: { value: "#fecaca" },
    300: { value: "#fca5a5" },
    400: { value: "#f87171" },
    500: { value: "#ef4444" },
    600: { value: "#dc2626" },
    700: { value: "#b91c1c" },
    800: { value: "#991b1b" },
  },
  purple: {
    100: { value: "#f3e8ff" },
    400: { value: "#c084fc" },
    500: { value: "#8b5cf6" },
    600: { value: "#7c3aed" },
  },
  cyan: {
    100: { value: "#cffafe" },
    400: { value: "#22d3ee" },
    500: { value: "#06b6d4" },
    600: { value: "#0891b2" },
  },
} as const;

export const fontSizes = {
  xs: { value: "0.75rem" }, // 12px minimum floor
  sm: { value: "0.875rem" }, // 14px
  md: { value: "1rem" }, // 16px
  lg: { value: "1.125rem" }, // 18px
  xl: { value: "1.25rem" }, // 20px
  "2xl": { value: "1.5rem" }, // 24px
  "3xl": { value: "1.875rem" }, // 30px
  "4xl": { value: "2.25rem" }, // 36px
  "5xl": { value: "3rem" }, // 48px
  "6xl": { value: "3.75rem" }, // 60px
} as const;

export const spacing = {
  // 4px scale
  0: { value: "0px" },
  1: { value: "4px" },
  2: { value: "8px" },
  3: { value: "12px" },
  4: { value: "16px" },
  5: { value: "20px" },
  6: { value: "24px" },
  8: { value: "32px" },
  10: { value: "40px" },
  12: { value: "48px" },
  16: { value: "64px" },
  20: { value: "80px" },
  24: { value: "96px" },
  32: { value: "128px" },
  ...pageSpacing,
} as const;

export const radii = {
  none: { value: "0px" },
  xs: { value: "4px" },
  sm: { value: "6px" }, // Inputs
  md: { value: "8px" }, // Standard buttons & cards
  lg: { value: "12px" }, // Containers
  xl: { value: "16px" }, // Bento cards
  "2xl": { value: "24px" }, // Section trays
  full: { value: "9999px" }, // Pill badges
} as const;

export const shadows = {
  // E16 PR 1: strengthened so a light card lifts off the sand canvas (paired with a 1px
  // border.DEFAULT edge on Card, KpiCard, Table and CollapsibleDrawer).
  cardLight: {
    value: "0 1px 2px rgba(43, 38, 32, 0.08), 0 4px 14px rgba(43, 38, 32, 0.07)",
  },
  cardHoverLight: {
    value: "0 2px 8px -2px rgba(43, 38, 32, 0.1)",
  },
  floatingLight: {
    value: "0 10px 25px -4px rgba(43, 38, 32, 0.14), 0 4px 10px -2px rgba(43, 38, 32, 0.07)",
  },
} as const;

// Universal Mapping (Consumed by Panda CSS)
export const semanticTokens = {
  colors: {
    // 1. Brand & Interactive Primary (Direction C teal). primary.solid/hover stay deep teal in BOTH
    // themes: they are fills behind primary.foreground (white), and white on the dark accent
    // (#5cc4ae) is only 2.11:1.
    primary: {
      DEFAULT: { value: { base: "{colors.teal.600}", _dark: "{colors.dark.primary}" } },
      solid: { value: { base: "{colors.teal.600}", _dark: "{colors.teal.600}" } },
      hover: { value: { base: "{colors.teal.700}", _dark: "{colors.teal.700}" } },
      subtle: { value: { base: "#e1f0eb", _dark: "#1e3b35" } },
      border: { value: { base: "#9ccfc2", _dark: "#2e6055" } },
      foreground: { value: "#ffffff" },
    },

    // 2. Layered Surfaces (Canonical surface namespace)
    surface: {
      DEFAULT: { value: { base: "#fffdf9", _dark: "{colors.dark.surface}" } },
      canvas: { value: { base: "{colors.sand.50}", _dark: "{colors.dark.canvas}" } },
      card: { value: { base: "#fffdf9", _dark: "{colors.dark.surface}" } },
      sunken: { value: { base: "{colors.sand.100}", _dark: "{colors.dark.surfaceSunken}" } },
      subtle: { value: { base: "{colors.sand.150}", _dark: "{colors.dark.subtle}" } },
      overlay: { value: { base: "#ffffff", _dark: "{colors.dark.surfaceOverlay}" } },
      contrast: { value: { base: "{colors.sand.800}", _dark: "{colors.dark.contrast}" } },
      // Deep-teal headline block: one per page (the headline figure). Text on it uses
      // text.onContrast (>= 4.5:1, asserted in tokens.a11y.test.ts).
      hero: { value: { base: "#12483f", _dark: "#1b5448" } },
      // Modal/drawer backdrop. A translucent backdrop, never a text surface: contrast is not
      // asserted, only that it visibly dims the page (see tokens.a11y.test.ts).
      scrim: { value: { base: "rgba(43, 38, 32, 0.4)", _dark: "rgba(8, 6, 4, 0.6)" } },
      // E16 PR 1 (P9, D16 option a): domain tints for icon tiles and at most ONE tinted section per
      // page. Never around a KpiStrip, a ScenarioZone or a chart, and KPI cards are never tinted.
      // Teal: net worth, mortgage, pension. Apricot: debt. Sage: savings. text.primary, secondary
      // and muted clear 4.5:1 on each, and each is >= 2 deltaE76 from every other surface (tests).
      tint: {
        teal: { value: { base: "#dcede6", _dark: "#1f322d" } },
        apricot: { value: { base: "#fae5cc", _dark: "#36291b" } },
        sage: { value: { base: "#e5edda", _dark: "#272f22" } },
      },
    },

    // 3. Typography Hierarchy
    text: {
      primary: { value: { base: "{colors.sand.900}", _dark: "{colors.dark.textPrimary}" } },
      secondary: { value: { base: "{colors.sand.700}", _dark: "{colors.dark.textSecondary}" } },
      muted: { value: { base: "{colors.sand.600}", _dark: "{colors.dark.textMuted}" } },
      onContrast: { value: { base: "#f6f1e8", _dark: "#fffdf9" } },
    },

    // 4. Hairline & Interactive Borders
    border: {
      DEFAULT: { value: { base: "{colors.sand.250}", _dark: "{colors.dark.border}" } },
      subtle: { value: { base: "{colors.sand.200}", _dark: "{colors.dark.borderSubtle}" } },
      strong: { value: { base: "{colors.sand.300}", _dark: "{colors.dark.borderStrong}" } },
      input: { value: { base: "{colors.sand.500}", _dark: "{colors.dark.borderInput}" } },
      focusRing: { value: { base: "{colors.teal.600}", _dark: "{colors.dark.primary}" } },
    },

    // 5. Unified Financial & System Status. Direction C values; positive is a yellower leaf green
    // (hue ~90) so it never reads as the teal primary (hue ~170); info keeps indigo. Every pair is
    // covered by the contrast matrix in tokens.a11y.test.ts.
    status: {
      positive: {
        text: { value: { base: "#3e6b12", _dark: "#a8d86a" } },
        bg: { value: { base: "#eaf3da", _dark: "#2a3316" } },
        border: { value: { base: "#bcd68f", _dark: "#4a6428" } },
        solid: { value: { base: "#3a5c08", _dark: "#c5de4c" } },
      },
      warning: {
        text: { value: { base: "#8a4a08", _dark: "#f2b873" } },
        bg: { value: { base: "#fcebd2", _dark: "#3b2c16" } },
        border: { value: { base: "#ebc38a", _dark: "#6b4b1e" } },
        solid: { value: { base: "#b06a10", _dark: "#e0a04a" } },
      },
      danger: {
        text: { value: { base: "#a13a2b", _dark: "#f4a593" } },
        bg: { value: { base: "#fbe5e0", _dark: "#3d221d" } },
        border: { value: { base: "#e8b0a4", _dark: "#74403a" } },
        solid: { value: { base: "#b64030", _dark: "#be5337" } },
      },
      info: {
        text: { value: { base: "#3730a3", _dark: "#a5a8ff" } },
        bg: { value: { base: "#eef0ff", _dark: "#1b1e4a" } },
        border: { value: { base: "#c7c9f7", _dark: "#3b3f8f" } },
        solid: { value: { base: "#4f46e5", _dark: "#8f92ff" } },
      },
      neutral: {
        text: { value: { base: "{colors.sand.700}", _dark: "{colors.dark.textSecondary}" } },
        bg: { value: { base: "#ece6dc", _dark: "#2e2a26" } },
        border: { value: { base: "#c9c0b2", _dark: "#4a443b" } },
        solid: { value: { base: "#766c5f", _dark: "#a59d90" } },
      },
    },

    // 6. Semantic Data Visualization & Chart Series. Liabilities use apricot (chart.debt), never
    // red: red is reserved for errors. series1..8 are ordered so adjacent pairs stay
    // distinguishable under colour-vision deficiency (see the CVD test); still pair every series
    // with a direct label, marker or dash so colour is never the only cue.
    chart: {
      primary: { value: { base: "{colors.teal.600}", _dark: "#5cc4ae" } },
      wealth: { value: { base: "#64885c", _dark: "#9ad0a0" } },
      debt: { value: { base: "#c26a18", _dark: "#eda45f" } },
      warning: { value: { base: "#94750f", _dark: "#e3b452" } },
      accentPurple: { value: { base: "#7e67a8", _dark: "#a98fe0" } },
      accentCyan: { value: { base: "#2f7fa0", _dark: "#6db5d6" } },
      series1: { value: { base: "{colors.teal.600}", _dark: "#5cc4ae" } },
      series2: { value: { base: "#64885c", _dark: "#9ad0a0" } },
      series3: { value: { base: "#c26a18", _dark: "#eda45f" } },
      series4: { value: { base: "#7e67a8", _dark: "#a98fe0" } },
      series5: { value: { base: "#b03f6a", _dark: "#e58aa2" } },
      series6: { value: { base: "#2f7fa0", _dark: "#6db5d6" } },
      series7: { value: { base: "#94750f", _dark: "#e3b452" } },
      series8: { value: { base: "#7a7064", _dark: "#a59d90" } },
      // Forecast / projected values: draw dashed so it is not told apart by colour alone.
      projection: { value: { base: "#6b3f2a", _dark: "#ffd2a8" } },
      // Confidence band: a low-alpha teal FILL behind lines, never a line itself. Verified only as
      // alpha-composited difference from the card (>= 1.1:1) and that chart.primary stays >= 3:1 on it.
      band: { value: { base: "rgba(15, 107, 94, 0.14)", _dark: "rgba(92, 196, 174, 0.15)" } },
      // Reference lines (targets, zero line, prior year).
      baseline: { value: { base: "{colors.sand.500}", _dark: "{colors.dark.borderInput}" } },
      grid: { value: { base: "rgba(43, 38, 32, 0.08)", _dark: "rgba(244, 239, 231, 0.08)" } },
    },
  },
  shadows: elevationShadows,
  radii: densityRadii.radii,
  spacing: densitySpacing,
  sizes: densitySizes,
};
