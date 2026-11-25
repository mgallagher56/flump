import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles, type StatusBadgeTone } from "./StatusBadge.styles";

export interface StatusBadgeProps {
  /** One or two words in sentence case. */
  label: string;
  /** Defaults to `neutral`. */
  tone?: StatusBadgeTone;
  testID?: string;
}

/** A small pill that labels something. Not interactive; never a warning colour. */
export function StatusBadge({ label, tone = "neutral", testID }: StatusBadgeProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.base, styles[tone]]} testID={testID}>
      <Text textStyle="label.sm" style={styles[`${tone}Text`]}>
        {label}
      </Text>
    </View>
  );
}
