import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** The touch target every pressable keeps, whatever style it is given (plan section 2). */
export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    target: { minHeight: theme.sizes["control.lg"], minWidth: theme.sizes["control.lg"] },
  });
