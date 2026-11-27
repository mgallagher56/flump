import { useMemo } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BACK, OPEN_MENU } from "../../copy/navigation";
import { useTheme, useThemeChoice } from "../../theme/ThemeProvider";
import { Icon } from "../Icon";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { ThemeCycleButton } from "../ThemeCycleButton";
import { createStyles } from "./AppHeader.styles";

export interface AppHeaderProps {
  /** The screen's name, read first by a screen reader. */
  title: string;
  /** Opens the More list. Left out on More itself. */
  onOpenMenu?: () => void;
  /** A page stacked over the tabs: Back, before the title. */
  onBack?: () => void;
}

/**
 * The top bar over each tab and each page stacked on them (E12 S4, plan 9.7): the screen's name,
 * Back on a stacked page, and, as web's phone top bar, the colour theme button (System, Light,
 * Dark, E12 S9) and a menu button that opens the More list. One header everywhere, not the
 * platform's on stacked pages.
 */
export function AppHeader({ title, onOpenMenu, onBack }: AppHeaderProps) {
  const theme = useTheme();
  const { preference, setPreference } = useThemeChoice();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.bar}>
      <View style={[styles.row, onBack ? styles.rowWithBack : null]}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={BACK}
            testID="header-back"
            style={styles.menu}
            onPress={onBack}
          >
            <Icon name="chevron-left" color="primary" />
          </Pressable>
        ) : null}
        {/* A page with no name (an unknown link) has no heading, not an empty one. */}
        {title ? (
          <Text accessibilityRole="header" textStyle="heading.sm" style={styles.title}>
            {title}
          </Text>
        ) : (
          <View style={styles.title} />
        )}
        <ThemeCycleButton preference={preference} onChange={setPreference} />
        {onOpenMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={OPEN_MENU}
            testID="header-menu"
            style={styles.menu}
            onPress={onOpenMenu}
          >
            <Icon name="menu" color="primary" />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
