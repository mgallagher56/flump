import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { alignSelf: "stretch", gap: theme.spacing["4"] },
    section: { gap: theme.spacing["2"], alignItems: "stretch" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["3"],
      paddingHorizontal: theme.spacing["4"],
      paddingVertical: theme.spacing["density.rowPadY"],
    },
    divided: { borderTopWidth: 1, borderTopColor: theme.colors["border.subtle"] },
    // The name wraps at large text rather than clip.
    name: { flex: 1, gap: theme.spacing["0"] },
    figure: { alignItems: "flex-end" },
  });
