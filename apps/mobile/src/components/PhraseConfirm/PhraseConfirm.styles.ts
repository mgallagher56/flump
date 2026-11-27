import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";
import { scaledTextStyle } from "../Text/Text.styles";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { gap: theme.spacing["density.gap"], alignSelf: "stretch" },
    input: {
      ...scaledTextStyle("body.md", theme),
      minHeight: theme.sizes["control.lg"],
      paddingHorizontal: theme.spacing["density.controlPadX"],
      paddingVertical: theme.spacing["density.controlPadY"],
      borderWidth: 1.5,
      borderRadius: theme.radii.control,
      borderColor: theme.colors["border.input"],
      backgroundColor: theme.colors["surface.card"],
      color: theme.colors["text.primary"],
    },
    inputLocked: { backgroundColor: theme.colors["surface.sunken"] },
  });
