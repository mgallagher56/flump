/**
 * E15 layout tokens: stacking order, control sizes and density.
 *
 * DENSITY: comfortable is the default. Put `data-density="compact"` on any ancestor to switch the
 * `density.*` semantic tokens (the `compact` Panda condition, defined in panda.config.ts).
 * Compact is for simulators, tables and account lists; touch targets (`sizes.touch`) never shrink.
 */
export const zIndex = {
  base: { value: "0" },
  sticky: { value: "10" },
  header: { value: "20" },
  dropdown: { value: "30" },
  overlay: { value: "40" },
  modal: { value: "50" },
  toast: { value: "60" },
} as const;

export const sizes = {
  control: {
    sm: { value: "32px" },
    md: { value: "40px" },
    lg: { value: "48px" },
    // Compact control heights, selected by the density tokens below
    compact: {
      sm: { value: "28px" },
      md: { value: "32px" },
      lg: { value: "40px" },
    },
  },
  // Minimum touch target (WCAG 2.5.5 / platform guidance)
  touch: { value: "44px" },
} as const;

/** Semantic density tokens: `{ base: comfortable, _compact: compact }`. */
export const densitySpacing = {
  density: {
    controlPadY: { value: { base: "10px", _compact: "6px" } },
    controlPadX: { value: { base: "14px", _compact: "10px" } },
    rowPadY: { value: { base: "12px", _compact: "8px" } },
    cardPad: { value: { base: "20px", _compact: "14px" } },
    gap: { value: { base: "16px", _compact: "10px" } },
  },
} as const;

export const densitySizes = {
  density: {
    control: {
      sm: { value: { base: "{sizes.control.sm}", _compact: "{sizes.control.compact.sm}" } },
      md: { value: { base: "{sizes.control.md}", _compact: "{sizes.control.compact.md}" } },
      lg: { value: { base: "{sizes.control.lg}", _compact: "{sizes.control.compact.lg}" } },
    },
  },
} as const;
