import { type ReactNode, type Ref, useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, type ScrollViewInstance, View } from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { createStyles } from "./Screen.styles";

export interface ScreenProps {
  children: ReactNode;
  /**
   * Scrolls by default, so content at 200% text or on a 320 point screen is never cut off. Turn it
   * off only for a screen that manages its own scrolling (a list).
   */
  scroll?: boolean;
  /** Centres short content vertically, as on the first screen. */
  centred?: boolean;
  /**
   * Which safe-area edges to pad. Defaults to all four; a screen under a stack header leaves out
   * `top`, because the header already clears it.
   */
  edges?: readonly Edge[];
  /**
   * Pull to refresh: the platform's own control, which spins until the promise settles. The figures
   * stay on screen while it runs. Only on a screen that scrolls.
   */
  onRefresh?: () => Promise<unknown>;
  /** The scroll view, for a screen that opens at one of its groups (Settings' net worth choices). */
  scrollRef?: Ref<ScrollViewInstance>;
  testID?: string;
}

const ALL_EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];

/** The page around every screen: the canvas colour, safe areas, the phone gutter and spacing. */
export function Screen({
  children,
  scroll = true,
  centred = false,
  edges = ALL_EDGES,
  onRefresh,
  scrollRef,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const content = [styles.content, centred ? styles.centred : null];
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // A failed refresh keeps what is on screen; the screen's own state says what failed.
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <SafeAreaView style={styles.screen} edges={edges} testID={testID}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={content}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={theme.colors["text.secondary"]}
                colors={[theme.colors.primary]}
                progressBackgroundColor={theme.colors["surface.card"]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={content}>{children}</View>
      )}
    </SafeAreaView>
  );
}
