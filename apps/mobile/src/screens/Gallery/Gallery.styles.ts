import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: { gap: theme.spacing["3"] },
    panel: {
      backgroundColor: theme.colors["surface.canvas"],
      borderColor: theme.colors["border.subtle"],
      borderWidth: 1,
      borderRadius: theme.radii.card,
      padding: theme.spacing["4"],
      gap: theme.spacing["3"],
    },
    state: { gap: theme.spacing["2"], alignItems: "flex-start" },
  });
