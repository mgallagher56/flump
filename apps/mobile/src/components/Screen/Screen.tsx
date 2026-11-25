import { type ReactNode, useMemo } from "react";
import { ScrollView, View } from "react-native";
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
  testID?: string;
}

const ALL_EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];

/** The page around every screen: the canvas colour, safe areas, the phone gutter and spacing. */
export function Screen({
  children,
  scroll = true,
  centred = false,
  edges = ALL_EDGES,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const content = [styles.content, centred ? styles.centred : null];

  return (
    <SafeAreaView style={styles.screen} edges={edges} testID={testID}>
      {scroll ? (
        <ScrollView contentContainerStyle={content}>{children}</ScrollView>
      ) : (
        <View style={content}>{children}</View>
      )}
    </SafeAreaView>
  );
}
