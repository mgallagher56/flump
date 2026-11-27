import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignSelf: "stretch",
      gap: theme.spacing["2"],
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["1"],
    },
    labelSlot: {
      flex: 1,
      minWidth: 0,
    },
    trigger: {
      alignSelf: "flex-start",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radii.control,
    },
    panel: {
      alignSelf: "stretch",
      backgroundColor: theme.colors["surface.subtle"],
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radii.control,
      padding: theme.spacing["3"],
    },
  });
