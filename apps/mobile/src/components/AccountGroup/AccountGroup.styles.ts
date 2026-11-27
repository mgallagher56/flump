import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { alignSelf: "stretch", gap: theme.spacing["2"] },
    header: { gap: theme.spacing["1"] },
    total: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["3"],
      paddingHorizontal: theme.spacing["3"],
      paddingVertical: theme.spacing["density.rowPadY"],
      borderTopWidth: 1,
      borderTopColor: theme.colors["border.subtle"],
    },
    totalLabel: { flex: 1 },
  });
