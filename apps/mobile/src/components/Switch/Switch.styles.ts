import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["3"],
      paddingVertical: theme.spacing["2"],
    },
    // The words take the room left by the switch and wrap at large text rather than clip.
    words: { flex: 1, gap: theme.spacing["1"] },
  });

/** The native switch's colours: the primary fill when on, the strong border when off. */
export const switchColours = (theme: Theme) => ({
  track: { false: theme.colors["border.strong"], true: theme.colors["primary.solid"] },
  thumb: theme.colors["surface.card"],
});
