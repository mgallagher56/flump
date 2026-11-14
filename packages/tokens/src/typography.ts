/**
 * E15 typography tokens. Plain values only (no Panda-only syntax) so E12 can consume them as data.
 *
 * FONT SWAP PROCEDURE: the three family stacks below are the ONLY place a typeface is named.
 * `fonts.body`, `fonts.heading`, `fonts.numeric` and the legacy `fonts.sans`/`display`/`mono`
 * keys all derive from `fontFamilies`, as do the textStyles. To change the typeface, edit the
 * relevant line here and swap the matching @fontsource import in src/fonts/fonts.css.
 */
const SYSTEM_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const fontFamilies = {
  body: `'Inter Variable', 'Inter', ${SYSTEM_SANS}`,
  heading: `'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', ${SYSTEM_SANS}`,
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const fonts = {
  // Semantic roles
  body: { value: fontFamilies.body },
  heading: { value: fontFamilies.heading },
  // Figures read best in the body face with tabular-nums; numeric aliases body.
  numeric: { value: fontFamilies.body },
  // Legacy keys, kept working
  display: { value: fontFamilies.heading },
  sans: { value: fontFamilies.body },
  mono: { value: fontFamilies.mono },
} as const;

export const lineHeights = {
  heading: { value: "1.2" },
  subheading: { value: "1.3" },
  control: { value: "1.4" },
  body: { value: "1.5" },
  prose: { value: "1.6" },
} as const;

export const fontWeights = {
  regular: { value: "400" },
  medium: { value: "500" },
  semibold: { value: "600" },
  bold: { value: "700" },
} as const;

export const letterSpacings = {
  display: { value: "-0.02em" },
  heading: { value: "-0.01em" },
  normal: { value: "0em" },
  label: { value: "0.02em" },
  caps: { value: "0.06em" },
} as const;

const TABULAR = "tabular-nums";

/**
 * Panda `textStyles`, usable as `textStyle: "heading.lg"`. Rules: 12px minimum, line heights
 * 1.2 to 1.6, fluid `clamp()` only on display, heading.xl and numeric.hero, numeric styles always
 * tabular-nums, weights at most 700 (E16). Font sizes in components come from these styles or the
 * `fontSizes` scale; `scripts/check-style-literals.ts` ratchets raw sizes out. Sentence case
 * everywhere: no style sets uppercase or caps tracking (E16 P7.3).
 */
export const textStyles = {
  display: {
    value: {
      fontFamily: fontFamilies.heading,
      fontSize: "clamp(2rem, 1.5rem + 2vw, 3rem)",
      fontWeight: "700",
      lineHeight: "1.2",
      letterSpacing: "-0.02em",
    },
  },
  heading: {
    xl: {
      value: {
        fontFamily: fontFamilies.heading,
        fontSize: "clamp(1.5rem, 1.25rem + 1vw, 2rem)",
        fontWeight: "700",
        lineHeight: "1.2",
        letterSpacing: "-0.02em",
      },
    },
    lg: {
      value: {
        fontFamily: fontFamilies.heading,
        fontSize: "1.375rem",
        fontWeight: "600",
        lineHeight: "1.3",
        letterSpacing: "-0.01em",
      },
    },
    md: {
      value: {
        fontFamily: fontFamilies.heading,
        fontSize: "1.125rem",
        fontWeight: "600",
        lineHeight: "1.3",
        letterSpacing: "-0.01em",
      },
    },
    sm: {
      value: {
        fontFamily: fontFamilies.heading,
        fontSize: "1rem",
        fontWeight: "600",
        lineHeight: "1.4",
        letterSpacing: "0em",
      },
    },
  },
  body: {
    lg: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "1.125rem",
        fontWeight: "400",
        lineHeight: "1.6",
      },
    },
    md: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "1rem",
        fontWeight: "400",
        lineHeight: "1.5",
      },
    },
    sm: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "0.875rem",
        fontWeight: "400",
        lineHeight: "1.5",
      },
    },
  },
  label: {
    md: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "0.875rem",
        fontWeight: "500",
        lineHeight: "1.4",
      },
    },
    sm: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "0.75rem",
        fontWeight: "500",
        lineHeight: "1.4",
      },
    },
  },
  numeric: {
    // E16: the one headline figure per page (HeroFigure). Fluid like display.
    hero: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "clamp(2.25rem, 1.75rem + 2vw, 3rem)",
        fontWeight: "700",
        lineHeight: "1.2",
        letterSpacing: "-0.02em",
        fontVariantNumeric: TABULAR,
      },
    },
    // E16 P3: "Not set" in a figure slot. Body size and regular weight so it never outranks a real
    // value; pair with `color: "text.muted"`.
    unset: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "1rem",
        fontWeight: "400",
        lineHeight: "1.5",
        fontVariantNumeric: TABULAR,
      },
    },
    // The only KPI value style (KpiCard).
    kpi: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "2rem",
        fontWeight: "600",
        lineHeight: "1.2",
        letterSpacing: "-0.02em",
        fontVariantNumeric: TABULAR,
      },
    },
    lg: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "1.25rem",
        fontWeight: "600",
        lineHeight: "1.3",
        letterSpacing: "-0.01em",
        fontVariantNumeric: TABULAR,
      },
    },
    md: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "1rem",
        fontWeight: "500",
        lineHeight: "1.4",
        fontVariantNumeric: TABULAR,
      },
    },
    sm: {
      value: {
        fontFamily: fontFamilies.body,
        fontSize: "0.875rem",
        fontWeight: "500",
        lineHeight: "1.4",
        fontVariantNumeric: TABULAR,
      },
    },
  },
} as const;
