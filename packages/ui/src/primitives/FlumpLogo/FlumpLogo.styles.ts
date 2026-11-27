import { css, cva } from "../../../styled-system/css";

export const flumpLogoRecipe = cva({
  base: { display: "inline-block", flexShrink: 0 },
  variants: {
    size: {
      sm: { width: "32px", height: "32px" },
      md: { width: "50px", height: "50px" },
      lg: { width: "96px", height: "96px" },
    },
  },
  defaultVariants: { size: "md" },
});

/**
 * The logo's paints: the `logo.*` tokens, so the bubbles follow light and dark. Panda has no colour
 * utility for `stopColor`, so a bare token name would fall back to black; `token()` resolves it to
 * the CSS variable. Each theme-dependent value names `_systemDark` too, for a dark system setting
 * with JavaScript off (D30). Colour and opacity are separate classes, combined on each stop. The opacities
 * that differ by theme (glass is clearer on the dark canvas) are mirrored by the mobile logo
 * (apps/mobile FlumpLogo.styles.ts, LOGO_OPACITY), whose test reads this file.
 */
export const logoStop = {
  teal: css({ stopColor: "token(colors.logo.teal)" }),
  sky: css({ stopColor: "token(colors.logo.sky)" }),
  violet: css({ stopColor: "token(colors.logo.violet)" }),
  rose: css({ stopColor: "token(colors.logo.rose)" }),
  glint: css({ stopColor: "token(colors.logo.glint)" }),
  shadow: css({ stopColor: "token(colors.logo.shadow)" }),
};

export const logoOpacity = {
  /** The tint at the bubble's centre and two thirds out. */
  core: css({ stopOpacity: { base: 0.4, _dark: 0.28, _systemDark: 0.28 } }),
  mid: css({ stopOpacity: { base: 0.62, _dark: 0.5, _systemDark: 0.5 } }),
  sheen: css({ stopOpacity: { base: 0.6, _dark: 0.5, _systemDark: 0.5 } }),
};

export const logoClasses = {
  backing: css({ fill: "logo.backing", opacity: { base: 0.55, _dark: 0.35, _systemDark: 0.35 } }),
  glint: css({ fill: "logo.glint", opacity: { base: 0.9, _dark: 0.85, _systemDark: 0.85 } }),
  /** Light: one flat ellipse in deep ink. */
  floorLight: css({
    fill: "logo.shadow",
    display: { base: "inline", _dark: "none", _systemDark: "none" },
  }),
  /** Dark: a soft contact shadow with the teal pooling faintly over it, both fading to nothing. */
  floorDark: css({ display: { base: "none", _dark: "inline", _systemDark: "inline" } }),
};
