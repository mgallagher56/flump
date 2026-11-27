import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";
import { textStyle } from "../../theme/textStyle";
import { scaledTextStyle } from "../Text/Text.styles";

const BORDER = 1.5;
/** A tabular digit's width as a share of the font size, with a little room to spare. */
const DIGIT_WIDTH = 0.7;

/**
 * A box wide enough for `chars` digits at the text size in force (the GOV.UK date input's 2, 2
 * and 4 character widths), never narrower than a 48 point target. It grows with the text, so the
 * three boxes wrap rather than clip at large sizes.
 */
export function boxWidth(theme: Theme, chars: number, textScale: number): number {
  const digits = chars * (textStyle("body.md").fontSize as number) * DIGIT_WIDTH * textScale;
  return Math.max(
    theme.sizes["control.lg"],
    Math.ceil(digits + 2 * theme.spacing["density.controlPadX"] + 2 * BORDER),
  );
}

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: { alignSelf: "stretch", gap: theme.spacing["2"], alignItems: "flex-start" },
    // The three boxes sit in a row and wrap at large text.
    parts: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["3"] },
    part: { gap: theme.spacing["1"] },
    box: {
      minHeight: theme.sizes["control.lg"],
      paddingHorizontal: theme.spacing["density.controlPadX"],
      borderWidth: BORDER,
      borderRadius: theme.radii.control,
      borderColor: theme.colors["border.input"],
      backgroundColor: theme.colors["surface.card"],
      justifyContent: "center",
    },
    focused: { borderColor: theme.colors["border.focusRing"] },
    disabled: { backgroundColor: theme.colors["surface.sunken"] },
    input: {
      ...scaledTextStyle("body.md", theme),
      paddingVertical: theme.spacing["density.controlPadY"],
      color: theme.colors["text.primary"],
      fontVariant: ["tabular-nums"],
    },
  });
