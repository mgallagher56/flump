import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles, type InlineAlertTone } from "./InlineAlert.styles";

export interface InlineAlertProps {
  /** What happened and what to do next, in one or two plain sentences. */
  message: string;
  /** Defaults to `danger`. */
  tone?: InlineAlertTone;
  testID?: string;
}

/**
 * A message in the flow of the screen, read out by screen readers when it appears. Not a toast:
 * it stays until the next action, so nobody has to catch it in time.
 */
export function InlineAlert({ message, tone = "danger", testID }: InlineAlertProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.base, styles[tone]]}
      testID={testID}
    >
      <Text color={tone === "danger" ? "danger" : "primary"}>{message}</Text>
    </View>
  );
}
