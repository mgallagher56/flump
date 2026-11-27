import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    group: { gap: theme.spacing["1"] },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["3"],
      paddingVertical: theme.spacing["2"],
    },
    // The words wrap at large text rather than clip.
    label: { flex: 1 },
    ring: {
      width: theme.spacing["6"],
      height: theme.spacing["6"],
      borderRadius: theme.radii.full,
      borderWidth: 2,
      borderColor: theme.colors["border.strong"],
      alignItems: "center",
      justifyContent: "center",
    },
    ringChosen: { borderColor: theme.colors["primary.solid"] },
    dot: {
      width: theme.spacing["3"],
      height: theme.spacing["3"],
      borderRadius: theme.radii.full,
      backgroundColor: theme.colors["primary.solid"],
    },
  });
