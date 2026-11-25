import type { ColorKey } from "@flump/tokens/native";
import { StyleSheet, type TextStyle } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";
import { type FixedTextStyleKey, textStyle } from "../../theme/textStyle";

/** The same colour names as the web `Text` (packages/ui Text.styles.ts), each a token. */
const TEXT_COLORS = {
  primary: "text.primary",
  secondary: "text.secondary",
  muted: "text.muted",
  onContrast: "text.onContrast",
  onHero: "text.onHero",
  positive: "status.positive.text",
  warning: "status.warning.text",
  danger: "status.danger.text",
  info: "status.info.text",
} as const satisfies Record<string, ColorKey>;

export type TextColor = keyof typeof TEXT_COLORS;

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tabular: { fontVariant: ["tabular-nums"] },
    primary: { color: theme.colors[TEXT_COLORS.primary] },
    secondary: { color: theme.colors[TEXT_COLORS.secondary] },
    muted: { color: theme.colors[TEXT_COLORS.muted] },
    onContrast: { color: theme.colors[TEXT_COLORS.onContrast] },
    onHero: { color: theme.colors[TEXT_COLORS.onHero] },
    positive: { color: theme.colors[TEXT_COLORS.positive] },
    warning: { color: theme.colors[TEXT_COLORS.warning] },
    danger: { color: theme.colors[TEXT_COLORS.danger] },
    info: { color: theme.colors[TEXT_COLORS.info] },
  });

/**
 * The token text style at the theme's preview scale. At scale 1 (the app) this is the token style,
 * and the system text size scales it as usual.
 */
export function scaledTextStyle(key: FixedTextStyleKey, theme: Theme): TextStyle {
  const base = textStyle(key);
  if (theme.textScale === 1) return base;
  return {
    ...base,
    fontSize: (base.fontSize as number) * theme.textScale,
    ...(base.lineHeight === undefined ? {} : { lineHeight: base.lineHeight * theme.textScale }),
  };
}
