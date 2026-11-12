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
  // E15 "Calm ledger" cool ink-blue neutrals (direction A). Light-theme surfaces, text and borders;
  // the semantic surface/text/border tokens map onto these. Slate stays for compatibility.
  ink: {
    50: { value: "#f7f8fb" }, // canvas
    100: { value: "#f0f2f7" }, // sunken
    150: { value: "#eceef6" }, // subtle
    200: { value: "#e9ebf2" }, // border.subtle
    250: { value: "#dfe2ec" }, // border
    300: { value: "#c3c8d8" }, // border.strong
    500: { value: "#7d849c" }, // border.input, chart.baseline (mockup #858ca4 gave 2.9:1 on subtle)
    600: { value: "#5d647c" }, // text.muted
    700: { value: "#454b64" }, // text.secondary
    800: { value: "#1b2040" }, // surface.contrast
    900: { value: "#14172b" }, // text.primary
  },
  // Special "Pro" Dark Mode (cool ink-blue; stepped surfaces: sunken < canvas < card < overlay)
  dark: {
    canvas: { value: "#0d1220" },
    subtle: { value: "#1a2238" },
    surface: { value: "#131a2c" },
    surfaceSunken: { value: "#0a0f1b" },
    surfaceOverlay: { value: "#1a2238" },
    border: { value: "#263050" },
    borderSubtle: { value: "#1c2542" },
    borderStrong: { value: "#3a4670" },
    borderInput: { value: "#6b7699" },
    contrast: { value: "#222b47" },
    textPrimary: { value: "#eceff9" },
    textSecondary: { value: "#b4bbd2" },
    textMuted: { value: "#98a0ba" },
    primary: { value: "#a5a8ff" },
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

export const fonts = {
  display: {
    value: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  sans: {
    value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  mono: {
    value: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
  xs: {
    value: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  cardLight: {
    value: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  cardHoverLight: {
    value: "0 2px 8px -2px rgba(15, 23, 42, 0.06)",
  },
  floatingLight: {
    value: "0 10px 25px -4px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04)",
  },
} as const;

// Universal Mapping (Consumed by Panda CSS)
export const semanticTokens = {
  colors: {
    // 1. Brand & Interactive Primary
    primary: {
      DEFAULT: { value: { base: "{colors.indigo.600}", _dark: "{colors.dark.primary}" } },
      solid: { value: { base: "{colors.indigo.600}", _dark: "{colors.indigo.600}" } },
      hover: { value: { base: "{colors.indigo.700}", _dark: "{colors.indigo.700}" } },
      subtle: { value: { base: "#eeefff", _dark: "#1d2050" } },
      border: { value: { base: "#c7c9f7", _dark: "#3b3f8f" } },
      foreground: { value: "#ffffff" },
    },

    // 2. Layered Surfaces (Canonical surface namespace)
    surface: {
      DEFAULT: { value: { base: "#ffffff", _dark: "{colors.dark.surface}" } },
      canvas: { value: { base: "{colors.ink.50}", _dark: "{colors.dark.canvas}" } },
      card: { value: { base: "#ffffff", _dark: "{colors.dark.surface}" } },
      sunken: { value: { base: "{colors.ink.100}", _dark: "{colors.dark.surfaceSunken}" } },
      subtle: { value: { base: "{colors.ink.150}", _dark: "{colors.dark.subtle}" } },
      overlay: { value: { base: "#ffffff", _dark: "{colors.dark.surfaceOverlay}" } },
      contrast: { value: { base: "{colors.ink.800}", _dark: "{colors.dark.contrast}" } },
      // Modal/drawer backdrop. A translucent backdrop, never a text surface: contrast is not
      // asserted, only that it visibly dims the page (see tokens.a11y.test.ts).
      scrim: { value: { base: "rgba(20, 23, 43, 0.4)", _dark: "rgba(5, 8, 16, 0.6)" } },
    },

    // 3. Typography Hierarchy
    text: {
      primary: { value: { base: "{colors.ink.900}", _dark: "{colors.dark.textPrimary}" } },
      secondary: { value: { base: "{colors.ink.700}", _dark: "{colors.dark.textSecondary}" } },
      muted: { value: { base: "{colors.ink.600}", _dark: "{colors.dark.textMuted}" } },
      onContrast: { value: { base: "#f4f5fb", _dark: "#f8fafc" } },
    },

    // 4. Hairline & Interactive Borders
    border: {
      DEFAULT: { value: { base: "{colors.ink.250}", _dark: "{colors.dark.border}" } },
      subtle: { value: { base: "{colors.ink.200}", _dark: "{colors.dark.borderSubtle}" } },
      strong: { value: { base: "{colors.ink.300}", _dark: "{colors.dark.borderStrong}" } },
      input: { value: { base: "{colors.ink.500}", _dark: "{colors.dark.borderInput}" } },
      focusRing: { value: { base: "{colors.indigo.600}", _dark: "{colors.dark.primary}" } },
    },

    // 5. Unified Financial & System Status. Values refined from direction A (E15); every pair is
    // covered by the contrast matrix in tokens.a11y.test.ts.
    status: {
      positive: {
        text: { value: { base: "#0f6b52", _dark: "#5fd3a6" } },
        bg: { value: { base: "#e6f4ee", _dark: "#0f2a26" } },
        border: { value: { base: "#b5dccb", _dark: "#1d5a49" } },
        solid: { value: { base: "#15855f", _dark: "#2fb88a" } },
      },
      warning: {
        text: { value: { base: "#8a5a00", _dark: "#f0bf6a" } },
        bg: { value: { base: "#fbf1dc", _dark: "#2b2210" } },
        border: { value: { base: "#ecd49a", _dark: "#5c4719" } },
        solid: { value: { base: "#b7791f", _dark: "#d99a2b" } },
      },
      danger: {
        text: { value: { base: "#b42318", _dark: "#ff9a92" } },
        bg: { value: { base: "#fdecea", _dark: "#2e1517" } },
        border: { value: { base: "#f4c0ba", _dark: "#6b2a2d" } },
        solid: { value: { base: "#d42a1e", _dark: "{colors.destructive.600}" } },
      },
      info: {
        text: { value: { base: "#3730a3", _dark: "#a5a8ff" } },
        bg: { value: { base: "#eef0ff", _dark: "#1b1e4a" } },
        border: { value: { base: "#c7c9f7", _dark: "#3b3f8f" } },
        solid: { value: { base: "#4f46e5", _dark: "#8f92ff" } },
      },
      neutral: {
        text: { value: { base: "{colors.ink.700}", _dark: "{colors.dark.textSecondary}" } },
        bg: { value: { base: "#eef0f5", _dark: "#1b2236" } },
        border: { value: { base: "#d5d9e5", _dark: "#303a5c" } },
        solid: { value: { base: "#6b7390", _dark: "#8790ad" } },
      },
    },

    // 6. Semantic Data Visualization & Chart Series. Liabilities use amber (chart.debt), never red:
    // red is reserved for errors. series1..8 are ordered so adjacent pairs stay distinguishable
    // under colour-vision deficiency (see the CVD test); still pair every series with a direct
    // label, marker or dash so colour is never the only cue.
    chart: {
      primary: { value: { base: "{colors.indigo.600}", _dark: "#8f92ff" } },
      wealth: { value: { base: "#0b8a6c", _dark: "#36c9a0" } },
      debt: { value: { base: "#b7791f", _dark: "#e0a844" } },
      warning: { value: { base: "#c2410c", _dark: "#f0883e" } },
      accentPurple: { value: { base: "#7c5cd6", _dark: "#b79cff" } },
      accentCyan: { value: { base: "#0e7490", _dark: "#4cc3e0" } },
      series1: { value: { base: "{colors.indigo.600}", _dark: "#8f92ff" } },
      series2: { value: { base: "#0b8a6c", _dark: "#36c9a0" } },
      series3: { value: { base: "#b7791f", _dark: "#e0a844" } },
      series4: { value: { base: "#7c5cd6", _dark: "#b79cff" } },
      series5: { value: { base: "#0e7490", _dark: "#4cc3e0" } },
      series6: { value: { base: "#a21caf", _dark: "#e468f5" } },
      series7: { value: { base: "#c2410c", _dark: "#f0883e" } },
      series8: { value: { base: "#64708f", _dark: "#8f9bbd" } },
      // Forecast / projected values: draw dashed so it is not told apart by colour alone.
      projection: { value: { base: "{colors.ink.600}", _dark: "{colors.dark.textMuted}" } },
      // Confidence band: a low-alpha FILL behind lines, never a line itself. Verified only as
      // alpha-composited difference from the card (>= 1.1:1) and that chart.primary stays >= 3:1 on it.
      band: { value: { base: "rgba(79, 70, 229, 0.14)", _dark: "rgba(143, 146, 255, 0.18)" } },
      // Reference lines (targets, zero line, prior year).
      baseline: { value: { base: "{colors.ink.500}", _dark: "{colors.dark.borderInput}" } },
      grid: { value: { base: "rgba(20, 23, 43, 0.07)", _dark: "rgba(255, 255, 255, 0.07)" } },
    },
  },
  shadows: {
    card: {
      value: {
        base: "{shadows.cardLight}",
        _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0,0,0,0.4)",
      },
    },
    cardHover: {
      value: {
        base: "{shadows.cardHoverLight}",
        _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 16px 32px rgba(0,0,0,0.5)",
      },
    },
    floating: {
      value: {
        base: "{shadows.floatingLight}",
        _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 20px 40px rgba(0,0,0,0.5)",
      },
    },
  },
};
