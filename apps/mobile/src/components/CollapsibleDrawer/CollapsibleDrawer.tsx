import { type ReactNode, useMemo, useState } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../Icon";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./CollapsibleDrawer.styles";

export interface CollapsibleDrawerProps {
  /** The control's words while closed ("Show changes by account"). */
  label: string;
  /** Its words while open ("Hide changes by account"). */
  openLabel: string;
  children: ReactNode;
  /** Defaults to closed. */
  initiallyOpen?: boolean;
  testID?: string;
}

/**
 * One quiet show and hide control over a block, as web's quiet `CollapsibleDrawer`: closed by
 * default, its words say what a press does, and a screen reader hears it expanded or collapsed.
 */
export function CollapsibleDrawer({
  label,
  openLabel,
  children,
  initiallyOpen = false,
  testID,
}: CollapsibleDrawerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.base} testID={testID}>
      <Pressable
        accessibilityState={{ expanded: open }}
        testID={testID ? `${testID}-toggle` : undefined}
        style={styles.toggle}
        onPress={() => setOpen((was) => !was)}
      >
        <Text textStyle="label.md" style={styles.label}>
          {open ? openLabel : label}
        </Text>
        {/* The one chevron, turned to point down while closed and up while open. */}
        <View style={open ? styles.up : styles.down}>
          <Icon name="chevron-right" size="sm" />
        </View>
      </Pressable>
      {open ? children : null}
    </View>
  );
}
