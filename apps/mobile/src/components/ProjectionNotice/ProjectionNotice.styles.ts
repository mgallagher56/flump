import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** A quiet box on the neutral status surface: information, never the danger style (copy 5.7). */
export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignSelf: "stretch",
      borderWidth: 1,
      borderRadius: theme.radii.card,
      padding: theme.spacing["3"],
      backgroundColor: theme.colors["status.neutral.bg"],
      borderColor: theme.colors["status.neutral.border"],
    },
  });
