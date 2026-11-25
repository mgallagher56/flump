import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";
import type { FixedTextStyleKey } from "../../theme/textStyle";

export type MoneySize = "sm" | "md" | "lg";
/** No danger colour on purpose: a debt is never red (plan section 2, look and words). */
export type MoneyColor = "primary" | "secondary" | "muted";

/** Fixed token text styles, so the figure follows the phone's text size. */
export const SIZE_TEXT: Record<MoneySize, FixedTextStyleKey> = {
  sm: "body.sm",
  md: "body.md",
  lg: "heading.lg",
};

/** Always tabular, so columns of figures line up (AGENTS.md section 2). */
export const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    figure: { fontVariant: ["tabular-nums"] },
  });
