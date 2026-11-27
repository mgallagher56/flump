import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    frame: { flex: 1, backgroundColor: theme.colors["surface.canvas"] },
    notice: {
      marginHorizontal: theme.spacing["page.gutter.sm"],
      marginTop: theme.spacing["3"],
      padding: theme.spacing["3"],
      gap: theme.spacing["1"],
      borderWidth: 1,
      borderRadius: theme.radii.card,
      backgroundColor: theme.colors["status.info.bg"],
      borderColor: theme.colors["status.info.border"],
    },
    action: {
      marginHorizontal: theme.spacing["page.gutter.sm"],
      marginTop: theme.spacing["2"],
      alignItems: "flex-start",
    },
    body: { flex: 1 },
  });
