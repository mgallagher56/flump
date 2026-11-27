import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ScrollView, type ScrollViewInstance, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { TAB_BAR_LABEL, tabPosition } from "../../copy/navigation";
import type { IconName } from "../../navigation/navItems";
import { useTheme } from "../../theme/ThemeProvider";
import { useTextScale } from "../../theme/useTextScale";
import { Icon } from "../Icon";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import {
  createStyles,
  LABEL_STYLE,
  overflowCues,
  scrollTargetForTab,
  tabLayout,
} from "./TabBar.styles";

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

function EdgeFade({
  side,
  color,
  style,
}: {
  side: "left" | "right";
  color: string;
  style: object;
}) {
  const id = useId();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
      testID={`tab-fade-${side}`}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity={side === "left" ? "1" : "0"} />
            <Stop offset="1" stopColor={color} stopOpacity={side === "left" ? "0" : "1"} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * The phone navigation (E12 S4, plan 9.7), drawn as web's bottom bar: icon over label, the current
 * tab on a teal pill. A `tablist` of `tab`s with the current one announced as selected; every tab
 * is at least 48 by 48 (Pressable). At large text the icons go and, when the sum of labels no
 * longer fits, the single row scrolls horizontally with content-sized cells, an edge fade cue and
 * the active tab scrolled into view.
 */
export function TabBar({ items, activeKey, onSelect }: TabBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);
  const textScale = useTextScale();
  const labels = useMemo(() => items.map((item) => item.label), [items]);
  const layout = tabLayout({
    labels,
    width,
    fontSize: theme.textStyles[LABEL_STYLE].fontSize * textScale,
    textScale,
  });

  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const cellsRef = useRef<Record<string, { x: number; width: number }>>({});
  const scrollXRef = useRef(0);
  const scrolledForKey = useRef<string | null>(null);
  const lastSentX = useRef<number | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const edgePadding = theme.spacing["6"];
  const scrollActiveIntoView = useCallback(() => {
    if (!layout.scroll) return;
    const cell = cellsRef.current[activeKey];
    if (!cell) return;
    if (scrolledForKey.current === activeKey && contentWidth > 0) return;
    const target = scrollTargetForTab({
      cellX: cell.x,
      cellWidth: cell.width,
      scrollX: scrollXRef.current,
      viewportWidth: width,
      contentWidth,
      edgePadding,
    });
    if (contentWidth > 0) scrolledForKey.current = activeKey;
    if (target !== null && target !== lastSentX.current) {
      lastSentX.current = target;
      scrollRef.current?.scrollTo({ x: target, animated: false });
    }
  }, [activeKey, contentWidth, edgePadding, layout.scroll, width]);

  useEffect(() => {
    scrolledForKey.current = null;
    lastSentX.current = null;
    if (!layout.scroll) {
      scrollXRef.current = 0;
      setScrollX(0);
      setContentWidth(0);
    }
  }, [activeKey, layout.scroll]);

  useEffect(() => {
    scrollActiveIntoView();
  }, [scrollActiveIntoView]);

  const cues = overflowCues({
    scroll: layout.scroll,
    scrollX,
    viewportWidth: width,
    contentWidth,
  });

  const row = (
    <View testID="tab-row" style={layout.scroll ? styles.scrollRow : styles.row}>
      {items.map((item, index) => {
        const selected = item.key === activeKey;
        return (
          <View
            key={item.key}
            testID={`tab-cell-${item.key}`}
            style={layout.scroll ? styles.scrollCell : styles.cell}
            onLayout={(event) => {
              const { x, width: cellWidth } = event.nativeEvent.layout;
              cellsRef.current[item.key] = { x, width: cellWidth };
              if (item.key === activeKey) scrollActiveIntoView();
            }}
          >
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
  );

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={styles.bar}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={TAB_BAR_LABEL}
        style={styles.tablist}
        testID="tab-bar"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {layout.scroll ? (
          <>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              contentContainerStyle={styles.scrollRow}
              testID="tab-scroll"
              onContentSizeChange={(w) => setContentWidth(w)}
              onScroll={(event) => {
                const x = event.nativeEvent.contentOffset.x;
                scrollXRef.current = x;
                lastSentX.current = null;
                setScrollX(x);
              }}
            >
              {row}
            </ScrollView>
            {cues.left ? (
              <EdgeFade
                side="left"
                color={theme.colors["surface.card"]}
                style={[styles.fade, styles.fadeLeft]}
              />
            ) : null}
            {cues.right ? (
              <EdgeFade
                side="right"
                color={theme.colors["surface.card"]}
                style={[styles.fade, styles.fadeRight]}
              />
            ) : null}
          </>
        ) : (
          row
        )}
      </View>
    </SafeAreaView>
  );
}
