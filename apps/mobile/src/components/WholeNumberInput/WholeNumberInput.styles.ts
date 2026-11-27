import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";
import { scaledTextStyle } from "../Text/Text.styles";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    box: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      gap: theme.spacing["1"],
      minHeight: theme.sizes["control.lg"],
      paddingHorizontal: theme.spacing["density.controlPadX"],
      borderWidth: 1.5,
      borderRadius: theme.radii.control,
      borderColor: theme.colors["border.input"],
      backgroundColor: theme.colors["surface.card"],
    },
    focused: { borderColor: theme.colors["border.focusRing"] },
    disabled: { backgroundColor: theme.colors["surface.sunken"] },
    input: {
      ...scaledTextStyle("body.md", theme),
      flex: 1,
      alignSelf: "stretch",
      paddingVertical: theme.spacing["density.controlPadY"],
      color: theme.colors["text.primary"],
      fontVariant: ["tabular-nums"],
    },
  });
