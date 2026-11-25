import type { ColorKey } from "@flump/tokens/native";
import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export type FlumpLogoSize = "sm" | "md" | "lg";

/** The web logo's sizes in points (packages/ui FlumpLogo.styles.ts: 32, 50 and 96 px). */
export const LOGO_SIZES: Record<FlumpLogoSize, number> = { sm: 32, md: 50, lg: 96 };

/**
 * The web logo's colours: the mark lit from above by primary.hover over primary.solid, a shadow in
 * text.primary, and highlights in the button label colour, so it reads in both themes.
 */
const LOGO_COLOURS = {
  bodyTop: "primary.hover",
  bodyBottom: "primary.solid",
  shadow: "text.primary",
  highlight: "primary.foreground",
} as const satisfies Record<string, ColorKey>;

/** The artwork, in the web logo's 200 by 200 view box. */
export const LOGO_ART = {
  viewBox: "0 0 200 200",
  shadow: { cx: 100, cy: 168, rx: 62, ry: 9, opacity: 0.18 },
  body: "M100 38c36 0 64 30 64 66 0 36-20 62-64 62s-64-26-64-62c0-36 28-66 64-66z",
  highlights: [
    { d: "M78 52c14-9 38-9 50 3-14-3-34-1-50-3z", opacity: 0.6 },
    {
      d: "M52 92c4-16 16-28 28-34-8 12-8 22-12 34 2 14 8 24 6 32-12-8-26-18-22-32z",
      opacity: 0.4,
    },
    { d: "M146 82c8 10 12 24 8 40-6-8-10-20-8-40z", opacity: 0.25 },
  ],
} as const;

/** The box for each size, and the artwork's paints in the theme's colours. */
export const createStyles = (theme: Theme) => ({
  box: StyleSheet.create({
    sm: { width: LOGO_SIZES.sm, height: LOGO_SIZES.sm },
    md: { width: LOGO_SIZES.md, height: LOGO_SIZES.md },
    lg: { width: LOGO_SIZES.lg, height: LOGO_SIZES.lg },
  }),
  paint: {
    bodyTop: theme.colors[LOGO_COLOURS.bodyTop],
    bodyBottom: theme.colors[LOGO_COLOURS.bodyBottom],
    shadow: theme.colors[LOGO_COLOURS.shadow],
    highlight: theme.colors[LOGO_COLOURS.highlight],
  },
});
