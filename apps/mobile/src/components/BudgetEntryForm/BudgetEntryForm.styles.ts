import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { alignSelf: "stretch", gap: theme.spacing["4"] },
    actions: { gap: theme.spacing["2"] },
  });
