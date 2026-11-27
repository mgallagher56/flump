import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    group: { gap: theme.spacing["density.gap"] },
    // Side by side while they fit; at large text they wrap rather than clip.
    actions: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["density.gap"] },
  });
