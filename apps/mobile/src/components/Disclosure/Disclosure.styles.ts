import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { alignSelf: "stretch", gap: theme.spacing["2"] },
    toggle: { flexDirection: "row", alignItems: "center", gap: theme.spacing["2"] },
    label: { flexShrink: 1 },
    down: { transform: [{ rotate: "90deg" }] },
    up: { transform: [{ rotate: "-90deg" }] },
  });
