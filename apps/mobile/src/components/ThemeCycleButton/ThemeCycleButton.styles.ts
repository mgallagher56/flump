import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // The same padding as the header's other buttons, so at 200% text its glyph stays off the edge.
    button: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radii.full,
      padding: theme.spacing["2"],
    },
    pressed: { backgroundColor: theme.colors["surface.subtle"] },
  });
