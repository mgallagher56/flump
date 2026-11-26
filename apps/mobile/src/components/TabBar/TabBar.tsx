import { useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TAB_BAR_LABEL, tabPosition } from "../../copy/navigation";
import type { IconName } from "../../navigation/navItems";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../Icon";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles, LABEL_STYLE, tabLayout } from "./TabBar.styles";

interface TabBarItem {
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
}

export interface TabBarProps {
  items: readonly TabBarItem[];
  /** The current tab's key. */
  activeKey: string;
  onSelect(key: string): void;
}

/**
 * The phone navigation (E12 S4, plan 9.7), drawn as web's bottom bar: icon over label, the current
 * tab on a teal pill. A `tablist` of `tab`s with the current one announced as selected; every tab
 * is at least 48 by 48 (Pressable). At large text the icons go and the tabs wrap onto more rows
 * rather than clip or shorten a label (web's bar drops its icons the same way).
 */
export function TabBar({ items, activeKey, onSelect }: TabBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);
  // A gallery or test preview sets the scale itself and turns the phone's setting off (Text).
  const textScale = theme.textScale !== 1 ? theme.textScale : window.fontScale;
  const longest = Math.max(...items.map((item) => item.label.length));
  const layout = tabLayout({
    count: items.length,
    width,
    longestLabel: longest,
    fontSize: theme.textStyles[LABEL_STYLE].fontSize * textScale,
    textScale,
  });

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={styles.bar}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={TAB_BAR_LABEL}
        testID="tab-bar"
        style={styles.list}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {items.map((item, index) => {
          const selected = item.key === activeKey;
          return (
            <View key={item.key} style={[styles.cell, { width: layout.cellWidth }]}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityHint={tabPosition(index + 1, items.length)}
                testID={`tab-${item.key}`}
                style={[styles.tab, selected ? styles.selected : null]}
                onPress={() => {
                  if (!selected) onSelect(item.key);
                }}
              >
                {layout.showIcons ? (
                  <Icon
                    name={item.icon}
                    color={selected ? "accent" : "secondary"}
                    testID={`tab-${item.key}-icon`}
                  />
                ) : null}
                <Text
                  textStyle={LABEL_STYLE}
                  style={[styles.label, selected ? styles.labelSelected : null]}
                >
                  {item.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
