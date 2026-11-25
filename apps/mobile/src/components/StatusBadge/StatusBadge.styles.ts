import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/** `neutral` for a plain fact ("Left out of net worth"); `info` for a note ("Calculated"). */
export type StatusBadgeTone = "neutral" | "info";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderRadius: theme.radii.full,
      paddingHorizontal: theme.spacing["2"],
      paddingVertical: theme.spacing["0"],
    },
    neutral: {
      backgroundColor: theme.colors["status.neutral.bg"],
      borderColor: theme.colors["status.neutral.border"],
    },
    info: {
      backgroundColor: theme.colors["status.info.bg"],
      borderColor: theme.colors["status.info.border"],
    },
    neutralText: { color: theme.colors["status.neutral.text"] },
    infoText: { color: theme.colors["status.info.text"] },
  });
