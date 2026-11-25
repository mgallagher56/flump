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
 * when a new message arrives (a live region on Android, an announcement on iOS, which has none).
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
      accessibilityLiveRegion="polite"
      style={styles.base}
      testID={testID}
    >
      <Text>{message}</Text>
    </View>
  );
}
