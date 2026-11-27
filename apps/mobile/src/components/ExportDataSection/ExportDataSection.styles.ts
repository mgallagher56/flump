import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { gap: theme.spacing["density.gap"], alignSelf: "stretch" },
  });
