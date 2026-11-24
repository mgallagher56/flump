import { elevationShadows } from "./elevation.js";
import { densityRadii, densitySizes, densitySpacing, pageSpacing } from "./layout.js";

export * from "./breakpoints.js";
export * from "./colorScheme.js";
export * from "./elevation.js";
export * from "./layout.js";
export * from "./motion.js";
export * from "./typography.js";

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
  // Midnight and Mint (owner, 24 Nov 2026; replaces E15 Direction C). Light neutrals are a pale
  // mint family with deep-green ink; the semantic surface/text/border tokens map onto these. Slate
  // stays for compatibility; indigo stays for status.info only.
  mint: {
    50: { value: "#e4f4ef" }, // canvas
    100: { value: "#d3eae3" }, // sunken
    150: { value: "#eef8f5" }, // subtle
    200: { value: "#d5e5e0" }, // border.subtle
    250: { value: "#b9d4cc" }, // border
    300: { value: "#9dc4b9" }, // border.strong
    400: { value: "#6fd0ba" }, // the mint fill: surface.hero, dark primary. Never text on a light ground
    500: { value: "#5e837a" }, // border.input, chart.baseline (3:1 on every light surface)
    600: { value: "#476060" }, // text.muted
    700: { value: "#2f4a4a" }, // text.secondary
    800: { value: "#14171c" }, // surface.contrast and the light primary fill (charcoal)
    900: { value: "#0f2a2a" }, // text.primary, text on the mint hero
    950: { value: "#f8fcfa" }, // the off-white: cards, bands and text on charcoal (never pure white)
  },
  // Teal: links, outline buttons and the focus ring in light; 700 is its hover.
  teal: {
    600: { value: "#0b6b5d" },
    700: { value: "#084f45" },
  },
  // Dark mode "Midnight": cool charcoal (stepped surfaces: sunken < canvas < card < subtle < overlay)
  dark: {
    canvas: { value: "#14171c" },
    subtle: { value: "#262b33" },
    surface: { value: "#1d2128" },
    surfaceSunken: { value: "#0f1216" },
    surfaceOverlay: { value: "#2a3039" },
    border: { value: "#303740" }, // Midnight #2c323b, one step up so a card edge reads at 1.3:1
    borderSubtle: { value: "#242931" },
    borderStrong: { value: "#3a424e" },
    borderInput: { value: "#737c88" },
    contrast: { value: "#0f1216" },
    textPrimary: { value: "#f1eee8" },
    textSecondary: { value: "#cdd1d7" },
    textMuted: { value: "#a9afb9" },
    primary: { value: "#6fd0ba" },
    primaryHover: { value: "#9be3d2" },
    onPrimary: { value: "#0e1a17" },
    pink: { value: "#e3b5d1" },
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
  // E16 PR 1: strengthened so a light card lifts off the mint canvas (paired with a 1px
  // border.DEFAULT edge on Card, KpiCard, Table and CollapsibleDrawer).
  cardLight: {
    value: "0 1px 2px rgba(15, 42, 42, 0.08), 0 4px 14px rgba(15, 42, 42, 0.07)",
  },
  cardHoverLight: {
    value: "0 2px 8px -2px rgba(15, 42, 42, 0.1)",
  },
  floatingLight: {
    value: "0 10px 25px -4px rgba(15, 42, 42, 0.14), 0 4px 10px -2px rgba(15, 42, 42, 0.07)",
  },
} as const;

// Universal Mapping (Consumed by Panda CSS)
export const semanticTokens = {
  colors: {
    // 1. Brand & Interactive Primary (Midnight and Mint). primary is the text and line colour: teal
    // in light (mint fails as text on a light ground), mint in dark. primary.solid/hover are the
    // button fills behind primary.foreground: charcoal with off-white text in light, mint with dark
    // ink in dark.
    primary: {
      DEFAULT: { value: { base: "{colors.teal.600}", _dark: "{colors.dark.primary}" } },
      solid: { value: { base: "{colors.mint.800}", _dark: "{colors.dark.primary}" } },
      hover: { value: { base: "#2c323b", _dark: "{colors.dark.primaryHover}" } },
      // Link hover: darker teal in light, lighter mint in dark.
      emphasis: { value: { base: "{colors.teal.700}", _dark: "{colors.dark.primaryHover}" } },
      subtle: { value: { base: "#cfe9e2", _dark: "#1f3532" } },
      border: { value: { base: "{colors.mint.300}", _dark: "#2f4a46" } },
      foreground: { value: { base: "{colors.mint.950}", _dark: "{colors.dark.onPrimary}" } },
    },

    // 1b. Accent. Decoration and wayfinding only: icon tiles, one small shape per scene, one chart
    // series (chart.accent) and one shape on surface.hero. Since Midnight and Mint (owner, 24 Nov
    // 2026) the light accent is a deep blue-teal, so damson leads nowhere in light; dark keeps the soft pink
    // for small accents only. Never on a figure, KPI card, table cell, button, link, focus ring,
    // notice or status message, and never to say anything about a person's money is good or bad.
    accent: {
      // Icons, shapes and lines; also text on card, canvas and accent.subtle (>= 4.5:1).
      DEFAULT: { value: { base: "#1d5f73", _dark: "{colors.dark.pink}" } },
      // The tinted surface. text.primary, secondary and muted clear 4.5:1 on it.
      subtle: { value: { base: "#d2eef0", _dark: "#2f2733" } },
      // The edge of an accent.subtle surface. Decorative, like border.DEFAULT.
      border: { value: { base: "{colors.mint.300}", _dark: "#5a4655" } },
      // The one shape allowed on surface.hero (>= 3:1 there in both themes). Never text.
      onHero: { value: { base: "{colors.teal.600}", _dark: "{colors.dark.pink}" } },
    },

    // 2. Layered Surfaces (Canonical surface namespace). Light never uses pure white: cards, bands
    // and the overlay are the off-white mint.950.
    surface: {
      DEFAULT: { value: { base: "{colors.mint.950}", _dark: "{colors.dark.surface}" } },
      canvas: { value: { base: "{colors.mint.50}", _dark: "{colors.dark.canvas}" } },
      card: { value: { base: "{colors.mint.950}", _dark: "{colors.dark.surface}" } },
      sunken: { value: { base: "{colors.mint.100}", _dark: "{colors.dark.surfaceSunken}" } },
      subtle: { value: { base: "{colors.mint.150}", _dark: "{colors.dark.subtle}" } },
      overlay: { value: { base: "#f2f5f4", _dark: "{colors.dark.surfaceOverlay}" } },
      // Charcoal: the footer, the closing band and small numbered markers. Text on it uses
      // text.onContrast.
      contrast: { value: { base: "{colors.mint.800}", _dark: "{colors.dark.contrast}" } },
      // The headline block, one per page. Light: solid mint with dark ink (text.onHero). Dark: a
      // card with an edge (border.hero) and a mint figure (text.heroFigure), as in Midnight.
      hero: { value: { base: "{colors.mint.400}", _dark: "{colors.dark.surface}" } },
      // Modal/drawer backdrop. A translucent backdrop, never a text surface: contrast is not
      // asserted, only that it visibly dims the page (see tokens.a11y.test.ts).
      scrim: { value: { base: "rgba(15, 42, 42, 0.4)", _dark: "rgba(5, 7, 9, 0.6)" } },
      // Domain tints for icon tiles and at most ONE tinted section per page. Never around a
      // KpiStrip, a ScenarioZone or a chart, and KPI cards are never tinted. Teal: net worth,
      // mortgage. Apricot: debt. Sage: savings (sky, rose and violet: see the area map in IconTile).
      // text.primary, secondary and muted clear 4.5:1 on each, and each is >= 2 deltaE76 from every
      // other surface (tests). Dark: about 1.25:1 against surface.card, so an icon tile reads on a
      // card.
      tint: {
        teal: { value: { base: "#c6e6dc", _dark: "#1d3934" } },
        apricot: { value: { base: "#fae5cc", _dark: "#42311c" } },
        sage: { value: { base: "#e1edd6", _dark: "#2b3822" } },
        sky: { value: { base: "#d8e8f2", _dark: "#1d3846" } },
        rose: { value: { base: "#f5e1ea", _dark: "#4d2939" } },
        violet: { value: { base: "#e3e0f4", _dark: "#353050" } },
      },
    },

    // 3. Typography Hierarchy
    text: {
      primary: { value: { base: "{colors.mint.900}", _dark: "{colors.dark.textPrimary}" } },
      secondary: { value: { base: "{colors.mint.700}", _dark: "{colors.dark.textSecondary}" } },
      muted: { value: { base: "{colors.mint.600}", _dark: "{colors.dark.textMuted}" } },
      // Text on surface.contrast (charcoal in light, the darkest step in dark).
      onContrast: { value: { base: "{colors.mint.950}", _dark: "{colors.mint.950}" } },
      // Text on surface.hero: dark ink on the light mint block, light text on the dark hero card.
      onHero: { value: { base: "{colors.mint.900}", _dark: "{colors.dark.textPrimary}" } },
      // The headline figure on surface.hero: dark ink in light, mint in dark.
      heroFigure: { value: { base: "{colors.mint.900}", _dark: "{colors.dark.primary}" } },
    },

    // 4. Hairline & Interactive Borders
    border: {
      DEFAULT: { value: { base: "{colors.mint.250}", _dark: "{colors.dark.border}" } },
      subtle: { value: { base: "{colors.mint.200}", _dark: "{colors.dark.borderSubtle}" } },
      strong: { value: { base: "{colors.mint.300}", _dark: "{colors.dark.borderStrong}" } },
      input: { value: { base: "{colors.mint.500}", _dark: "{colors.dark.borderInput}" } },
      focusRing: { value: { base: "{colors.teal.600}", _dark: "{colors.dark.primary}" } },
      // The edge of surface.hero: the fill itself in light, a visible edge on the dark hero card.
      hero: { value: { base: "{colors.mint.400}", _dark: "{colors.dark.borderStrong}" } },
      // Section titles in the app sit on this rule so sections are clearly separated.
      section: { value: { base: "{colors.mint.900}", _dark: "{colors.dark.borderInput}" } },
    },

    // 5. Unified Financial & System Status. Positive is a yellower leaf green (hue ~90) so it never
    // reads as the teal primary (hue ~170); info keeps indigo. Every pair is covered by the contrast
    // matrix in tokens.a11y.test.ts.
    status: {
      positive: {
        text: { value: { base: "#3e6b12", _dark: "#a8d86a" } },
        bg: { value: { base: "#eaf3da", _dark: "#1f3622" } },
        border: { value: { base: "#bcd68f", _dark: "#3a6340" } },
        solid: { value: { base: "#3a5c08", _dark: "#c5de4c" } },
      },
      warning: {
        text: { value: { base: "#8a4a08", _dark: "#f2b873" } },
        bg: { value: { base: "#fcebd2", _dark: "#382b18" } },
        border: { value: { base: "#ebc38a", _dark: "#6b4b1e" } },
        solid: { value: { base: "#b06a10", _dark: "#e0a04a" } },
      },
      danger: {
        text: { value: { base: "#a13a2b", _dark: "#f4a593" } },
        bg: { value: { base: "#fbe5e0", _dark: "#3b2320" } },
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
        text: { value: { base: "{colors.mint.700}", _dark: "{colors.dark.textSecondary}" } },
        bg: { value: { base: "#dbe9e5", _dark: "#262b33" } },
        border: { value: { base: "#a9c6be", _dark: "#46505c" } },
        solid: { value: { base: "#5a716d", _dark: "#a9afb9" } },
      },
    },

    // 6. Semantic Data Visualization & Chart Series. Liabilities use apricot (chart.debt), never
    // red: red is reserved for errors. series1..8 are ordered so adjacent pairs stay
    // distinguishable under colour-vision deficiency (see the CVD test); still pair every series
    // with a direct label, marker or dash so colour is never the only cue.
    chart: {
      primary: { value: { base: "{colors.teal.600}", _dark: "{colors.dark.primary}" } },
      wealth: { value: { base: "#64885c", _dark: "#9ad0a0" } },
      debt: { value: { base: "#c26a18", _dark: "#eda45f" } },
      warning: { value: { base: "#94750f", _dark: "#e3b452" } },
      accentPurple: { value: { base: "#7e67a8", _dark: "#a98fe0" } },
      accentCyan: { value: { base: "#2f7fa0", _dark: "#6db5d6" } },
      // The accent as a chart series (same values as accent.DEFAULT). At most one series per chart,
      // always with a direct label and a dash. Never for debt, a loss or a gain.
      accent: { value: { base: "#1d5f73", _dark: "{colors.dark.pink}" } },
      series1: { value: { base: "{colors.teal.600}", _dark: "{colors.dark.primary}" } },
      series2: { value: { base: "#64885c", _dark: "#9ad0a0" } },
      series3: { value: { base: "#c26a18", _dark: "#eda45f" } },
      series4: { value: { base: "#7e67a8", _dark: "#a98fe0" } },
      series5: { value: { base: "#b03f6a", _dark: "#e58aa2" } },
      series6: { value: { base: "#2f7fa0", _dark: "#6db5d6" } },
      series7: { value: { base: "#94750f", _dark: "#e3b452" } },
      series8: { value: { base: "#5f7470", _dark: "#a9afb9" } },
      // Forecast / projected values: draw dashed so it is not told apart by colour alone.
      projection: { value: { base: "#6b3f2a", _dark: "#ffd2a8" } },
      // Confidence band: a low-alpha teal FILL behind lines, never a line itself. Verified only as
      // alpha-composited difference from the card (>= 1.1:1) and that chart.primary stays >= 3:1 on it.
      band: { value: { base: "rgba(11, 107, 93, 0.14)", _dark: "rgba(111, 208, 186, 0.15)" } },
      // Reference lines (targets, zero line, prior year).
      baseline: { value: { base: "{colors.mint.500}", _dark: "{colors.dark.borderInput}" } },
      grid: { value: { base: "rgba(15, 42, 42, 0.08)", _dark: "rgba(241, 238, 232, 0.08)" } },
    },
  },
  shadows: elevationShadows,
  radii: densityRadii.radii,
  spacing: densitySpacing,
  sizes: densitySizes,
};
