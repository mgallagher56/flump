import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: { gap: theme.spacing["3"], alignSelf: "stretch" },
    head: { gap: theme.spacing["1"] },
    calculated: { gap: theme.spacing["2"], alignItems: "flex-start" },
    // Buttons stack, full width: at 200% text or 320 points wide two side by side would clip.
    actions: { gap: theme.spacing["2"], alignSelf: "stretch" },
    nav: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["2"] },
  });
