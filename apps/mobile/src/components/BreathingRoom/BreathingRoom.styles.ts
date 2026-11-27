import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { alignSelf: "stretch", gap: theme.spacing["2"] },
    result: { gap: theme.spacing["0"] },
    basis: { gap: theme.spacing["1"] },
    line: { flexDirection: "row", alignItems: "center", gap: theme.spacing["3"] },
    // The name wraps at large text rather than clip.
    lineName: { flex: 1 },
  });
