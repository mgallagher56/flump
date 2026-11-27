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
    },
    pressed: { backgroundColor: theme.colors["surface.subtle"] },
    // The name and type wrap at large text; the figure keeps its own width beside them.
    text: { flex: 1, gap: theme.spacing["1"] },
  });
