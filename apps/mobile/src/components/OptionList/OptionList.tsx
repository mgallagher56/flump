import { useMemo } from "react";
import { Platform, View } from "react-native";
import { tabPosition } from "../../copy/navigation";
import { useTheme } from "../../theme/ThemeProvider";
import { pressedStyle } from "../Button/Button.styles";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./OptionList.styles";

interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

export interface OptionListProps<T extends string> {
  /** The group's name, shown above it and read for the group. */
  label: string;
  /** Help under the name. */
  hint?: string;
  options: readonly Option<T>[];
  value: T;
  /** Called with the option chosen; not called for the one already chosen. */
  onChange(value: T): void;
  /** Saving: every option is announced as busy and ignores presses until it clears. */
  busy?: boolean;
  /** Each option's test id is `<testID>-<value>`. */
  testID?: string;
}

/**
 * One choice from a short list, as a radio group: each option a row at least 48 high with its
 * state and its place in the list. It changes nothing itself: the caller saves and passes the
 * saved value back.
 */
export function OptionList<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  busy = false,
  testID,
}: OptionListProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={styles.group}
      testID={testID}
    >
      <Text textStyle="label.md">{label}</Text>
      {hint ? (
        <Text textStyle="body.sm" color="secondary">
          {hint}
        </Text>
      ) : null}
      {options.map((option, index) => {
        const chosen = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityHint={tabPosition(index + 1, options.length)}
            accessibilityState={{ checked: chosen }}
            busy={busy}
            testID={testID ? `${testID}-${option.value}` : undefined}
            // Press feedback as the Button's: iOS dims, Android draws a ripple.
            android_ripple={{ color: theme.colors["surface.subtle"] }}
            style={({ pressed }) => [styles.option, pressedStyle(pressed, Platform.OS)]}
            onPress={() => {
              if (!chosen) onChange(option.value);
            }}
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.ring, chosen ? styles.ringChosen : null]}
            >
              {chosen ? <View testID={`option-dot-${option.value}`} style={styles.dot} /> : null}
            </View>
            <Text style={styles.label}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
