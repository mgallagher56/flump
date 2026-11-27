import { useMemo, useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import {
  CHART_HEIGHT,
  CHART_INSET,
  createStyles,
  DASH,
  POINT_RADIUS,
  STROKE,
} from "./MonthLineChart.styles";

/** One month on the line: the engine's height fraction, and whether its figure is carried. */
interface MonthLinePoint {
  /** 0 is the bottom of the plot, 1 the top (`selectChartFractions`). */
  fraction: number;
  /** Not recorded: a segment to or from it is dashed. */
  carried: boolean;
}

export interface MonthLineChartProps {
  /** Oldest first, evenly spaced. Two or more to draw a line. */
  points: readonly MonthLinePoint[];
  testID?: string;
}

/** Where a point sits in the drawing, in points: geometry from the engine's fractions only. */
function place(index: number, count: number, fraction: number, width: number) {
  const plotWidth = width - CHART_INSET * 2;
  const plotHeight = CHART_HEIGHT - CHART_INSET * 2;
  const x = CHART_INSET + (count > 1 ? (index / (count - 1)) * plotWidth : plotWidth / 2);
  const y = CHART_INSET + (1 - fraction) * plotHeight;
  return { x, y };
}

/**
 * A balance or net worth over the months, as web's `MonthLinePlot` without its axes: straight
 * segments between the engine's point heights, a dashed segment where a month is carried, the
 * latest month marked. In the text colour, so a fall has no colour of its own. Hidden from screen
 * readers, which read the summary and the month list beside it instead, as web's chart.
 */
export function MonthLineChart({ points, testID = "month-line-chart" }: MonthLineChartProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const ink = theme.colors["text.primary"];
  const placed = points.map((p, i) => place(i, points.length, p.fraction, width));
  const last = placed.at(-1);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={onLayout}
      style={styles.root}
      testID={testID}
    >
      {width > 0 && points.length > 1 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          {placed.slice(1).map((to, i) => {
            const from = placed[i] ?? to;
            const dashed = points[i]?.carried === true || points[i + 1]?.carried === true;
            return (
              <Line
                key={i}
                testID={`${testID}-segment-${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={ink}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={dashed ? DASH : undefined}
              />
            );
          })}
          {last ? (
            <Circle
              testID={`${testID}-latest`}
              cx={last.x}
              cy={last.y}
              r={POINT_RADIUS}
              fill={ink}
            />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
