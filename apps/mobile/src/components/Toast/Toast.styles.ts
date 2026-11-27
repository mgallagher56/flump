import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** The neutral info surface: a toast reports, it never alarms, so it is never red. */
export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignSelf: "stretch",
      borderWidth: 1,
      borderRadius: theme.radii.card,
      padding: theme.spacing["3"],
      backgroundColor: theme.colors["status.info.bg"],
      borderColor: theme.colors["status.info.border"],
    },
    overlay: {
      boxShadow: theme.shadows.overlay,
    },
  });
