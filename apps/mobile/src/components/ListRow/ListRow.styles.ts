import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["3"],
      paddingHorizontal: theme.spacing["3"],
      paddingVertical: theme.spacing["density.rowPadY"],
      borderRadius: theme.radii.card,
    },
    pressed: { backgroundColor: theme.colors["surface.subtle"] },
    // The label wraps at large text rather than clip.
    label: { flex: 1 },
    end: { marginLeft: "auto" },
  });
