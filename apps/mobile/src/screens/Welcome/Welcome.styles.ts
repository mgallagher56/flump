import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";
import { textStyle } from "../../theme/textStyle";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors["surface.canvas"],
    },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing["page.gutter.sm"],
      paddingVertical: theme.spacing["page.top.sm"],
      gap: theme.spacing["3"],
    },
    name: {
      ...textStyle("heading.lg"),
      color: theme.colors["text.primary"],
    },
    tagline: {
      ...textStyle("body.lg"),
      color: theme.colors["text.secondary"],
    },
    devLink: {
      minHeight: theme.sizes["control.lg"],
      minWidth: theme.sizes["control.lg"],
      justifyContent: "center",
      alignSelf: "flex-start",
      marginTop: theme.spacing["6"],
    },
    devLinkText: {
      ...textStyle("label.md"),
      color: theme.colors.accent,
      textDecorationLine: "underline",
    },
  });
