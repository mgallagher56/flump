/**
 * E15 elevation. Light uses soft ink-tinted shadows. Dark elevates by LIGHTER surface plus a
 * hairline inset highlight, with only a modest shadow, never heavy black. Every key has `_dark`.
 * These are the semantic `shadows` tokens; `card`, `cardHover` and `floating` stay for existing consumers.
 */
const HAIRLINE_DARK = "inset 0 1px 0 rgba(255, 255, 255, 0.06)";

export const elevationShadows = {
  xs: {
    value: {
      base: "0 1px 2px rgba(20, 23, 43, 0.05)",
      _dark: HAIRLINE_DARK,
    },
  },
  card: {
    value: {
      base: "{shadows.cardLight}",
      _dark: `${HAIRLINE_DARK}, 0 1px 2px rgba(0, 0, 0, 0.24)`,
    },
  },
  raised: {
    value: {
      base: "0 2px 8px -2px rgba(20, 23, 43, 0.1)",
      _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 4px 12px rgba(0, 0, 0, 0.28)",
    },
  },
  overlay: {
    value: {
      base: "0 8px 24px rgba(20, 23, 43, 0.12)",
      _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 24px rgba(0, 0, 0, 0.36)",
    },
  },
  // Two-ring focus halo: a gap in the surface colour, then the focus ring colour.
  focus: {
    value: {
      base: "0 0 0 2px {colors.surface.card}, 0 0 0 4px {colors.border.focusRing}",
      _dark: "0 0 0 2px {colors.surface.card}, 0 0 0 4px {colors.border.focusRing}",
    },
  },
  // Legacy aliases (same elevation, lighter dark treatment)
  cardHover: {
    value: {
      base: "{shadows.cardHoverLight}",
      _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 4px 12px rgba(0, 0, 0, 0.28)",
    },
  },
  floating: {
    value: {
      base: "{shadows.floatingLight}",
      _dark: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 24px rgba(0, 0, 0, 0.36)",
    },
  },
} as const;
