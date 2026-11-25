import { useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { createStyles } from "./Skeleton.styles";

export interface SkeletonProps {
  /** What is loading, read out in place of the blocks ("Loading your accounts"). */
  label: string;
  /** How many blocks. Defaults to 3. */
  lines?: number;
  testID?: string;
}

/** A still placeholder while content loads: announced as busy, its blocks hidden from screen readers. */
export function Skeleton({ label, lines = 3, testID }: SkeletonProps) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, fontScale), [theme, fontScale]);
  const count = Math.max(1, Math.floor(lines));
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={styles.base}
      testID={testID}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          testID="skeleton-line"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.line, i === count - 1 && count > 1 ? styles.last : null]}
        />
      ))}
    </View>
  );
}
