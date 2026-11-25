import { type ReactNode, useMemo } from "react";
import { type StyleProp, View, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import {
  type CardElevation,
  type CardPadding,
  type CardSurface,
  createStyles,
  PADDING_STYLE,
} from "./Card.styles";

export interface CardProps extends Omit<ViewProps, "style"> {
  children: ReactNode;
  /** Defaults to `default`. */
  surface?: CardSurface;
  /** Defaults to `resting`. */
  elevation?: CardElevation;
  /** Defaults to `md`. */
  padding?: CardPadding;
  /** Layout only (margins, flex). Colours, radius and padding come from the props. */
  style?: StyleProp<ViewStyle>;
}

/** A bordered block on the card surface, with the web Card's surface, elevation and padding names. */
export function Card({
  children,
  surface = "default",
  elevation = "resting",
  padding = "md",
  style,
  ...props
}: CardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View
      {...props}
      style={[
        styles.base,
        styles[surface],
        styles[elevation],
        styles[PADDING_STYLE[padding]],
        styles.gap,
        style,
      ]}
    >
      {children}
    </View>
  );
}
