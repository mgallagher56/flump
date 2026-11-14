/**
 * E15 elevation (round 5). Light uses soft WARM-tinted shadows (the warm charcoal ink, rgb 43 38 32,
 * not blue-grey), so lift reads as sand-coloured depth. Dark elevates by LIGHTER surface (see the
 * `surface.*` dark steps) plus a hairline: an inset top highlight and a 1px outer ring, with only a
 * modest black shadow (alpha at most 0.3), never heavy. Every key has `_dark`.
 * These are the semantic `shadows` tokens; `card`, `cardHover` and `floating` stay for existing consumers.
 */
const HAIRLINE_DARK = "inset 0 1px 0 rgba(255, 255, 255, 0.06)";
const RING_DARK = "0 0 0 1px rgba(255, 255, 255, 0.05)";

export const elevationShadows = {
  xs: {
    value: {
      base: "0 1px 2px rgba(43, 38, 32, 0.07)",
      _dark: `${HAIRLINE_DARK}, ${RING_DARK}`,
    },
  },
  card: {
    value: {
      base: "{shadows.cardLight}",
      _dark: `${HAIRLINE_DARK}, ${RING_DARK}, 0 1px 2px rgba(0, 0, 0, 0.2)`,
    },
  },
  raised: {
    value: {
      base: "0 2px 8px -2px rgba(43, 38, 32, 0.12), 0 1px 2px rgba(43, 38, 32, 0.06)",
      _dark: `inset 0 1px 0 rgba(255, 255, 255, 0.09), ${RING_DARK}, 0 4px 12px rgba(0, 0, 0, 0.24)`,
    },
  },
  overlay: {
    value: {
      base: "0 12px 32px -4px rgba(43, 38, 32, 0.16), 0 4px 8px -2px rgba(43, 38, 32, 0.08)",
      _dark: `inset 0 1px 0 rgba(255, 255, 255, 0.1), ${RING_DARK}, 0 8px 24px rgba(0, 0, 0, 0.3)`,
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
      _dark: `inset 0 1px 0 rgba(255, 255, 255, 0.09), ${RING_DARK}, 0 4px 12px rgba(0, 0, 0, 0.24)`,
    },
  },
  floating: {
    value: {
      base: "{shadows.floatingLight}",
      _dark: `inset 0 1px 0 rgba(255, 255, 255, 0.1), ${RING_DARK}, 0 8px 24px rgba(0, 0, 0, 0.3)`,
    },
  },
} as const;
