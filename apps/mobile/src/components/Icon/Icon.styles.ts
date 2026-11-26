import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export type IconSize = "sm" | "md";
export type IconColor = "primary" | "secondary" | "accent";

/** Web's `Icon` sizes: sm 16, md 24. The art is drawn on a 24 grid and scales with the box. */
export const ICON_SIZES = { sm: 16, md: 24 } as const satisfies Record<IconSize, number>;

export const createStyles = (theme: Theme) => ({
  box: StyleSheet.create({
    sm: { width: ICON_SIZES.sm, height: ICON_SIZES.sm },
    md: { width: ICON_SIZES.md, height: ICON_SIZES.md },
  }),
  /** `accent` is the selected tab's teal, as web's current bottom bar item. */
  stroke: {
    primary: theme.colors["text.primary"],
    secondary: theme.colors["text.secondary"],
    accent: theme.colors.primary,
  } satisfies Record<IconColor, string>,
});
