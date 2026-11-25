import { textStyles } from "@flump/tokens/native";
import type { TextStyle } from "react-native";

type TextStyleKey = keyof typeof textStyles;

/** The token text styles with one fixed size. Fluid styles (display, heading.xl, numeric.hero) need the screen width and come later. */
export type FixedTextStyleKey = {
  [K in TextStyleKey]: (typeof textStyles)[K]["fontSize"] extends number ? K : never;
}[TextStyleKey];

/**
 * A token text style as a React Native style. The token's `fontFamily` is a role name ("body",
 * "heading"), not an installed font, so it is left out and the system font is used until the brand
 * fonts are bundled. Sizes follow the system text size because React Native scales them by default.
 */
export function textStyle(key: FixedTextStyleKey): TextStyle {
  const { fontFamily: _role, ...style } = textStyles[key];
  return style as TextStyle;
}
