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
 * Teal family: deep teal on light, the mint-teal on dark, via the semantic primary tokens.
 * Panda has no colour utility for `stopColor`, so a bare token name is emitted as an invalid
 * value and the stop falls back to black. `token()` resolves it to the CSS variable.
 */
export const logoClasses = {
  bodyTop: css({ stopColor: "token(colors.primary)" }),
  bodyBottom: css({ stopColor: "token(colors.primary.hover)" }),
  shadow: css({ fill: "text.primary", opacity: 0.18 }),
  highlight: css({ fill: "text.onContrast" }),
};
