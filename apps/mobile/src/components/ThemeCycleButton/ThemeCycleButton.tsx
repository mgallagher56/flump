import { useMemo } from "react";
import { themeCycleLabel } from "../../copy/settings";
import { nextThemePreference, type ThemePreference } from "../../device/themePreference";
import type { IconName } from "../../navigation/navItems";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../Icon";
import { Pressable } from "../Pressable";
import { createStyles } from "./ThemeCycleButton.styles";

export interface ThemeCycleButtonProps {
  /** The current choice. */
  preference: ThemePreference;
  /** Called with the next choice in web's order: System, Light, Dark, then System. */
  onChange(next: ThemePreference): void;
  testID?: string;
}

/** Web's icons for each choice (`ThemeToggle`: Monitor, Sun, Moon). */
const ICONS: Record<ThemePreference, IconName> = { system: "monitor", light: "sun", dark: "moon" };

/**
 * Web's phone header theme button (`ThemeToggle`, `cycle` variant): one 48 point button that shows
 * the current choice and moves to the next on each press, named in web's words.
 */
export function ThemeCycleButton({
  preference,
  onChange,
  testID = "header-theme",
}: ThemeCycleButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const next = nextThemePreference(preference);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={themeCycleLabel(preference, next)}
      testID={testID}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
      onPress={() => onChange(next)}
    >
      <Icon name={ICONS[preference]} color="primary" testID={`theme-icon-${ICONS[preference]}`} />
    </Pressable>
  );
}
