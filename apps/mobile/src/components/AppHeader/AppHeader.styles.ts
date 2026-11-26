import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      backgroundColor: theme.colors["surface.canvas"],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["2"],
      paddingLeft: theme.spacing["page.gutter.sm"],
      paddingRight: theme.spacing["1"],
      paddingVertical: theme.spacing["1"],
    },
    // The title takes the room left by the button and wraps at large text rather than clip.
    title: { flex: 1, paddingVertical: theme.spacing["2"] },
    menu: { alignItems: "center", justifyContent: "center", borderRadius: theme.radii.full },
  });
