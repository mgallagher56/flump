import { useMemo } from "react";
// React Native's own switch, drawn by the platform; biome.json restricts only raw pressables.
import { Switch as NativeSwitch, Platform, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { pressedStyle } from "../Button/Button.styles";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles, switchColours } from "./Switch.styles";

export interface SwitchProps {
  /** What the switch turns on, which is also its accessible name. */
  label: string;
  value: boolean;
  /** Called with the new value when pressed. */
  onValueChange(next: boolean): void;
  /** Help under the label, also read as the switch's hint. */
  hint?: string;
  /** Saving: announced as busy, and presses are ignored until it clears (web's aria-disabled). */
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
}

/**
 * An on and off choice, as web's `Switch`: the label and hint on the left, the platform's own
 * switch on the right in our colours. The whole row is the control: at least 48 high, one switch
 * for a screen reader with its state, label and hint, and a press anywhere on it toggles. The
 * native switch takes no touches or focus of its own, so one press is one change. It changes
 * nothing itself: the caller saves and passes the saved value back.
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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const colours = switchColours(theme);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      busy={busy}
      disabled={disabled}
      testID={testID}
      // Press feedback as the Button's: iOS dims, Android draws a ripple.
      android_ripple={{ color: theme.colors["surface.subtle"] }}
      style={({ pressed }) => [styles.row, pressedStyle(pressed, Platform.OS)]}
      onPress={() => onValueChange(!value)}
    >
      <View style={styles.words}>
        <Text>{label}</Text>
        {hint ? (
          <Text textStyle="body.sm" color="secondary">
            {hint}
          </Text>
        ) : null}
      </View>
      {/* Hidden on the switch itself too: the wrapper alone did not hide it on the device check
          (a view with no style can be flattened away), so a screen reader found two controls. */}
      <View
        pointerEvents="none"
        collapsable={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <NativeSwitch
          testID="switch-native"
          accessible={false}
          focusable={false}
          // React Native's switch claims every touch that reaches it and flips itself, which would
          // be a second change beside the row's; none reach it, even if the wrapper is flattened.
          pointerEvents="none"
          accessibilityRole="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          value={value}
          disabled={disabled || busy}
          trackColor={colours.track}
          thumbColor={colours.thumb}
          ios_backgroundColor={colours.track.false}
        />
      </View>
    </Pressable>
  );
}
