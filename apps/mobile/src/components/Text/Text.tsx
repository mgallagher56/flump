import { useMemo } from "react";
// The one place raw React Native text is allowed (biome.json, apps/mobile override).
import { Text as NativeText, type TextProps as NativeTextProps } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { FixedTextStyleKey } from "../../theme/textStyle";
import { createStyles, scaledTextStyle, type TextColor } from "./Text.styles";

export interface TextProps
  extends Omit<NativeTextProps, "allowFontScaling" | "maxFontSizeMultiplier" | "numberOfLines"> {
  /** A token text style with a fixed size. Defaults to `body.md`. */
  textStyle?: FixedTextStyleKey;
  /** The web `Text` colour names. Defaults to `primary`. */
  color?: TextColor;
  /** Tabular numerals. Set it on every figure, date and percentage. */
  tabular?: boolean;
  /** One line with an ellipsis. */
  truncate?: boolean;
  /** At most this many lines. */
  lineClamp?: 1 | 2 | 3 | 4;
}

/**
 * All text in the app. Sizes follow the phone's text size setting, which cannot be turned off here.
 * Mirrors the web `Text` (CROSS-PLATFORM section 3): the same style, colour and tabular names.
 */
export function Text({
  textStyle = "body.md",
  color = "primary",
  tabular,
  truncate,
  lineClamp,
  style,
  ...props
}: TextProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const lines = truncate ? 1 : lineClamp;
  // A gallery preview draws the scale itself, so the phone's setting must not multiply it again.
  const preview = theme.textScale !== 1;

  return (
    <NativeText
      {...props}
      {...(lines ? { numberOfLines: lines, ellipsizeMode: "tail" as const } : {})}
      {...(preview ? { allowFontScaling: false } : {})}
      style={[
        scaledTextStyle(textStyle, theme),
        styles[color],
        tabular ? styles.tabular : null,
        style,
      ]}
    />
  );
}
