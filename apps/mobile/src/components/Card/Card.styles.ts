import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** `default` is `surface.card`; `subtle` and `sunken` sit back for quiet blocks (as on web). */
export type CardSurface = "default" | "subtle" | "sunken";
/**
 * The web elevations that have a native shadow token today. `interactive` and `floating` need the
 * `cardHover` and `floating` shadows in `@flump/tokens/native`, and come with the first screen that
 * uses them.
 */
export type CardElevation = "none" | "resting";
export type CardPadding = "none" | "sm" | "md" | "lg";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      backgroundColor: theme.colors["surface.card"],
      borderRadius: theme.radii.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    default: {},
    subtle: { backgroundColor: theme.colors["surface.subtle"] },
    sunken: { backgroundColor: theme.colors["surface.sunken"] },
    none: {},
    resting: { boxShadow: theme.shadows.card },
    padNone: { padding: theme.spacing["0"] },
    // The web sm is 12px; lg is 20px on a phone-width screen (it grows only from md up).
    padSm: { padding: theme.spacing["3"] },
    padMd: { padding: theme.spacing["density.cardPad"] },
    padLg: { padding: theme.spacing["5"] },
    gap: { gap: theme.spacing["2"] },
  });

export const PADDING_STYLE = {
  none: "padNone",
  sm: "padSm",
  md: "padMd",
  lg: "padLg",
} as const satisfies Record<CardPadding, string>;
