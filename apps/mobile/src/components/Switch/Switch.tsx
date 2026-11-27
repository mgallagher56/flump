import { useMemo } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import { useTheme } from "../../theme/ThemeProvider";
import { pressedStyle } from "../Button/Button.styles";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./Switch.styles";

export interface SwitchProps {
  /** What the switch turns on, which is also its accessible name. */
  label: string;
  value: boolean;
  /** Called with the new value when pressed. */
  onValueChange(next: boolean): void;
  /** Help under the label, also read as the switch's hint. */
  hint?: string;
  /** Saving: announced as busy (not disabled), and presses are ignored until it clears. */
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
}

/**
 * An on and off choice, as web's `Switch`: the label and hint on the left, a switch on the right
 * drawn with plain views to the platform's size in our colours. The whole row is the control: at
 * least 48 high, one switch for a screen reader with its state, label and hint, and a press
 * anywhere on it toggles. The switch is drawn rather than React Native's own because a native
 * switch inside the row stayed a second clickable, focusable control on Android whatever its props
 * said. It moves without animation, so there is nothing for Reduce Motion to stop. While busy, it
 * keeps its enabled colours and shows a delayed saving spinner so fast saves do not flicker. It
 * changes nothing itself: the caller saves and passes the saved value back.
 */
export function Switch({
  label,
  value,
  onValueChange,
  hint,
  busy = false,
  disabled = false,
  testID,
}: SwitchProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, Platform.OS), [theme]);
  const showBusy = useDelayedLoading(busy && !disabled);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value, busy }}
      disabled={disabled}
      testID={testID}
      // Press feedback as the Button's: iOS dims, Android draws a ripple.
      android_ripple={busy || disabled ? undefined : { color: theme.colors["surface.subtle"] }}
      style={({ pressed }) => [styles.row, pressedStyle(pressed && !busy, Platform.OS)]}
      onPress={busy ? undefined : () => onValueChange(!value)}
    >
      <View style={styles.words}>
        <Text color={disabled ? "muted" : "primary"}>{label}</Text>
        {hint ? (
          <Text textStyle="body.sm" color="secondary">
            {hint}
          </Text>
        ) : null}
      </View>
      <View style={styles.control}>
        <View
          testID="switch-busy-slot"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.busySlot}
        >
          {showBusy ? (
            <ActivityIndicator
              size="small"
              color={theme.colors["text.secondary"]}
              testID="switch-busy"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
        </View>
        {/* A drawing only: the row above carries the role, state and presses. */}
        <View
          testID="switch-track"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.track,
            disabled
              ? value
                ? styles.trackDisabledOn
                : styles.trackDisabledOff
              : value
                ? styles.trackOn
                : styles.trackOff,
          ]}
        >
          <View
            testID="switch-thumb"
            style={[
              styles.thumb,
              disabled ? (value ? styles.thumbDisabledOn : styles.thumbDisabledOff) : null,
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}
