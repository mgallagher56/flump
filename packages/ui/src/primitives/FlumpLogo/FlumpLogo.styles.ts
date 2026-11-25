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
 * The logo's own tokens: a teal mark in light and a mint mark in dark (primary.mark, lit from above
 * by primary.markLit). Not the charcoal button fill, which read as a black ball (owner, 25 Nov
 * 2026). The highlights take the button label colour, so they read on either mark. Panda has no
 * colour utility for `stopColor`, so a bare token name is emitted as an invalid value and the stop
 * falls back to black. `token()` resolves it to the CSS variable.
 */
export const logoClasses = {
  bodyTop: css({ stopColor: "token(colors.primary.markLit)" }),
  bodyBottom: css({ stopColor: "token(colors.primary.mark)" }),
  shadow: css({ fill: "text.primary", opacity: 0.18 }),
  highlight: css({ fill: "primary.foreground" }),
};
