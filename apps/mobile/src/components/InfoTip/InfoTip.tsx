import { useMemo, useState } from "react";
import { AccessibilityInfo, Platform, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { pressedStyle } from "../Button/Button.styles";
import { Icon } from "../Icon";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./InfoTip.styles";

export interface InfoTipProps {
  /** What the tip explains, used for the default trigger label `About {term}`. */
  term: string;
  /** Plain-English explanation shown when expanded. */
  body: string;
  /** Accessible name for the trigger button. Defaults to `About {term}`. */
  label?: string;
  /** Defaults to closed. */
  initiallyOpen?: boolean;
  testID?: string;
}

/**
 * Quiet "i" button that toggles a plain-English explanation in place and announces it to screen
 * readers when opened. Keeps a 48 by 48 point target via `Pressable`.
 */
export function InfoTip({ term, body, label, initiallyOpen = false, testID }: InfoTipProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(initiallyOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) AccessibilityInfo.announceForAccessibility(body);
  };

  return (
    <View style={styles.base} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? `About ${term}`}
        accessibilityState={{ expanded: open }}
        android_ripple={{ color: theme.colors["surface.subtle"] }}
        style={({ pressed }) => [styles.trigger, pressedStyle(pressed, Platform.OS)]}
        testID={testID ? `${testID}-trigger` : undefined}
        onPress={toggle}
      >
        <Icon name="info" size="sm" color="secondary" />
      </Pressable>
      {open ? (
        <View accessible style={styles.panel} testID={testID ? `${testID}-body` : undefined}>
          <Text textStyle="body.sm" color="secondary">
            {body}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
