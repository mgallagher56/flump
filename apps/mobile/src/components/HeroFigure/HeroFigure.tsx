import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { formatWholePounds, Money } from "../Money/Money";
import { Text } from "../Text";
import { createStyles } from "./HeroFigure.styles";

export interface HeroFigureProps {
  /** What the figure is ("Net worth"). */
  label: string;
  /** Pounds. `null` shows "Not set", never £0. */
  value: number | null;
  /** One short line of context under the figure ("Recorded in October"). */
  caption?: string | null;
  testID?: string;
}

/**
 * The one headline figure on a screen, as on web: a label, the figure in whole pounds and an
 * optional caption. Read out as one item so the label and figure stay together.
 */
export function HeroFigure({ label, value, caption, testID }: HeroFigureProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const spoken = [label, formatWholePounds(value), caption].filter(Boolean).join(", ");
  return (
    <View accessible accessibilityLabel={spoken} style={styles.base} testID={testID}>
      <Text textStyle="label.md" color="secondary">
        {label}
      </Text>
      <Money value={value} size="lg" />
      {caption ? (
        <Text textStyle="body.sm" color="secondary">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
