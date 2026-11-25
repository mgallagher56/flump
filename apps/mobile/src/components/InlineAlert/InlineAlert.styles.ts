import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** `danger` for something that went wrong; `info` for a neutral notice. Red is for errors only. */
export type InlineAlertTone = "danger" | "info";

const TONE_COLOURS = {
  danger: { fill: "status.danger.bg", edge: "status.danger.border" },
  info: { fill: "status.info.bg", edge: "status.info.border" },
} as const satisfies Record<InlineAlertTone, { fill: string; edge: string }>;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      borderWidth: 1,
      borderRadius: theme.radii.card,
      padding: theme.spacing["3"],
      alignSelf: "stretch",
    },
    danger: {
      backgroundColor: theme.colors[TONE_COLOURS.danger.fill],
      borderColor: theme.colors[TONE_COLOURS.danger.edge],
    },
    info: {
      backgroundColor: theme.colors[TONE_COLOURS.info.fill],
      borderColor: theme.colors[TONE_COLOURS.info.edge],
    },
  });
