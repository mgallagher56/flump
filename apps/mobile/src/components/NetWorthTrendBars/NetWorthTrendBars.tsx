import type { NetWorthTrend, NetWorthTrendBar } from "@flump/finance-engine/net-worth";
import { useMemo } from "react";
import { View } from "react-native";
import { barLine, missedLine, trendIntro } from "../../copy/home";
import { useTheme } from "../../theme/ThemeProvider";
import { createStyles, percent } from "./NetWorthTrendBars.styles";

export interface NetWorthTrendBarsProps {
  /** From `selectNetWorthTrend`: the bars and their geometry. Draw nothing when it is null. */
  trend: NetWorthTrend;
  /** Defaults to "net-worth-trend". */
  testID?: string;
}

/** What a screen reader hears for the bars: web's visually hidden list, read in order. */
function trendSummary(trend: NetWorthTrend): string {
  const lines = trend.bars.flatMap((bar) => [
    ...(bar.missedBefore ? [missedLine(bar.missedBefore)] : []),
    barLine(bar),
  ]);
  return `${trendIntro(trend.bars.length)} ${lines.join(". ")}.`;
}

/**
 * The Home hero's trend bars, as web's `NetWorthTrendBars`: net worth at the last recorded months,
 * oldest on the left, the latest solid and the others outlined, every bar from one zero line on the
 * engine's uncropped scale. A break in the check-ins is one empty slot. Plain views placed at the
 * engine's percentages: no arithmetic on money here, no arrows and no colour for a fall. The
 * drawing is hidden from screen readers, which hear the same months and figures as one list.
 */
export function NetWorthTrendBars({ trend, testID = "net-worth-trend" }: NetWorthTrendBarsProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // One slot per bar, and one empty slot before a bar that follows a break.
  const slots: (NetWorthTrendBar | null)[] = trend.bars.flatMap((bar) =>
    bar.missedBefore ? [null, bar] : [bar],
  );
  return (
    <View accessible accessibilityLabel={trendSummary(trend)} testID={testID} style={styles.root}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.plot}
        testID={`${testID}-plot`}
      >
        {slots.map((bar, i) => (
          <View key={bar?.month ?? `gap-${i}`} style={styles.slot}>
            {bar && bar.height > 0 ? (
              <View
                testID={`${testID}-bar-${bar.month}`}
                style={[
                  styles.bar,
                  bar.latest ? styles.latest : styles.earlier,
                  { top: percent(bar.top), height: percent(bar.height) },
                ]}
              />
            ) : null}
          </View>
        ))}
        <View testID={`${testID}-zero`} style={[styles.zero, { top: percent(trend.zeroLine) }]} />
      </View>
    </View>
  );
}
