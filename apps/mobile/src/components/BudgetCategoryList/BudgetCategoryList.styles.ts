import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { alignSelf: "stretch", gap: theme.spacing["3"] },
    heading: { gap: theme.spacing["1"], alignItems: "flex-start" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["3"],
      paddingHorizontal: theme.spacing["4"],
      paddingVertical: theme.spacing["density.rowPadY"],
    },
    openRow: { backgroundColor: theme.colors["surface.subtle"] },
    divided: { borderTopWidth: 1, borderTopColor: theme.colors["border.subtle"] },
    // The name wraps at large text rather than clip; the figure keeps its own width.
    name: { flex: 1, gap: theme.spacing["0"] },
    down: { transform: [{ rotate: "90deg" }] },
    up: { transform: [{ rotate: "-90deg" }] },
    entries: {
      paddingHorizontal: theme.spacing["4"],
      paddingBottom: theme.spacing["3"],
      gap: theme.spacing["2"],
    },
    entry: { flexDirection: "row", alignItems: "center", gap: theme.spacing["3"] },
  });
