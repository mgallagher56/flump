import { useMemo } from "react";
import { View } from "react-native";
import type { IconName } from "../../navigation/navItems";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../Icon";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./ListRow.styles";

export interface ListRowProps {
  label: string;
  /** Left out where the list has no icons (the Settings list, E12 S9). */
  icon?: IconName;
  onPress(): void;
  /** `link` for a row that opens a page (the default); `button` for an action such as Sign out. */
  accessibilityRole?: "link" | "button";
  testID?: string;
}

/**
 * A row in a list of places, as a row of web's phone drawer: icon, then label, at least 48 high.
 * A row that opens a page ends in a chevron; an action does not.
 */
export function ListRow({
  label,
  icon,
  onPress,
  accessibilityRole = "link",
  testID,
}: ListRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      {icon ? <Icon name={icon} /> : null}
      <Text style={styles.label}>{label}</Text>
      {accessibilityRole === "link" ? (
        <View style={styles.end}>
          <Icon name="chevron-right" size="sm" testID="row-chevron" />
        </View>
      ) : null}
    </Pressable>
  );
}
