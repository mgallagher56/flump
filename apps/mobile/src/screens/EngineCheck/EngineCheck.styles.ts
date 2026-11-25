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
      paddingHorizontal: theme.spacing["page.gutter.sm"],
      paddingVertical: theme.spacing["page.top.sm"],
      gap: theme.spacing["4"],
    },
    title: {
      ...textStyle("heading.md"),
      color: theme.colors["text.primary"],
    },
    card: {
      backgroundColor: theme.colors["surface.card"],
      borderColor: theme.colors["border.subtle"],
      borderWidth: 1,
      borderRadius: theme.radii.card,
      padding: theme.spacing["density.cardPad"],
      gap: theme.spacing["2"],
    },
    label: {
      ...textStyle("label.md"),
      color: theme.colors["text.secondary"],
    },
    result: {
      ...textStyle("body.md"),
      color: theme.colors["text.primary"],
      fontVariant: ["tabular-nums"],
    },
    detail: {
      ...textStyle("body.sm"),
      color: theme.colors["text.secondary"],
      fontVariant: ["tabular-nums"],
    },
  });
