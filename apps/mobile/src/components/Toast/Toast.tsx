import { useEffect, useMemo } from "react";
import { AccessibilityInfo, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles } from "./Toast.styles";

export interface ToastProps {
  /** What just happened, in one plain sentence. `null` shows nothing. */
  message: string | null;
  testID?: string;
}

/**
 * A quiet status message in the flow of the screen: no floating, no timer, no motion. It is read out
 * once when a new message arrives, by an announcement on both platforms: a live region would make
 * Android say it twice, and one on a view that has only just appeared is not reliably read.
 */
export function Toast({ message, testID }: ToastProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  if (!message) return null;
  return (
    <View
      accessible
      // React Native has no "status" role on native; "summary" is the nearest it accepts.
      accessibilityRole="summary"
      style={styles.base}
      testID={testID}
    >
      <Text>{message}</Text>
    </View>
  );
}
