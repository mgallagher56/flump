import { useMemo } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OPEN_MENU } from "../../copy/navigation";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../Icon";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./AppHeader.styles";

export interface AppHeaderProps {
  /** The screen's name, read first by a screen reader. */
  title: string;
  /** Opens the More list. Left out on More itself. */
  onOpenMenu?: () => void;
}

/**
 * The top bar over each tab (E12 S4, plan 9.7): the screen's name and, as web's phone top bar, a
 * menu button that opens the More list. The light and dark toggle joins it in S9.
 */
export function AppHeader({ title, onOpenMenu }: AppHeaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.bar}>
      <View style={styles.row}>
        <Text accessibilityRole="header" textStyle="heading.sm" style={styles.title}>
          {title}
        </Text>
        {onOpenMenu ? (
          <Pressable
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
