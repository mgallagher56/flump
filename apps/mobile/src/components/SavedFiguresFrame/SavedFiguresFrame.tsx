import { formatRelativeTime } from "@flump/format";
import { type ReactNode, useMemo } from "react";
import { View } from "react-native";
import { SAVED_FIGURES } from "../../copy/offline";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Text } from "../Text";
import { createStyles } from "./SavedFiguresFrame.styles";

export interface SavedFiguresFrameProps {
  /** When Flump last sent the oldest of the figures shown (ms since the epoch). */
  savedAt: number;
  /** The phone's clock now, injected so the age is testable. */
  now: number;
  /** A reconnect from Try again is running. */
  checking: boolean;
  onTryAgain(): void;
  /** The screen showing the saved figures. */
  children?: ReactNode;
}

/**
 * Saved figures shown offline (E12 S7): a fixed notice above the screen saying they are from the
 * last time Flump was reached and how long ago, that changes need a connection, and Try again. The
 * notice stays put while the screen scrolls, so the figures are never read without it.
 */
export function SavedFiguresFrame({
  savedAt,
  now,
  checking,
  onTryAgain,
  children,
}: SavedFiguresFrameProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // A clock a little behind the server's never says "in 2 minutes".
  const when = formatRelativeTime(Math.min(savedAt, now), now);
  return (
    <View style={styles.frame}>
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={styles.notice}
        testID="saved-figures-notice"
      >
        <Text>{SAVED_FIGURES.lastUpdated(when)}</Text>
        <Text color="secondary">{SAVED_FIGURES.changes}</Text>
      </View>
      <View style={styles.action}>
        <Button
          label={SAVED_FIGURES.tryAgain}
          variant="secondary"
          pending={checking}
          onPress={onTryAgain}
        />
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}
