import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    block: { gap: theme.spacing["2"], alignSelf: "stretch" },
    // Name above figure: holds at 200% text and 320 points wide without clipping.
    row: { gap: theme.spacing["1"], paddingVertical: theme.spacing["2"] },
    figure: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: theme.spacing["2"],
    },
    actions: { gap: theme.spacing["2"], alignSelf: "stretch" },
  });
