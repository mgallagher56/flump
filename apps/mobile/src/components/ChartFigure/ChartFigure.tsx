import { useMemo, useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import {
  CHART_HEIGHT,
  CHART_INSET,
  createStyles,
  DASH,
  POINT_RADIUS,
  STROKE,
} from "./ChartFigure.styles";

/** One month on the line: the engine's height fraction, and whether its figure is carried. */
interface MonthLinePoint {
  /** 0 is the bottom of the plot, 1 the top (`selectChartFractions`). */
  fraction: number;
  /** Not recorded: a segment to or from it is dashed. */
  carried: boolean;
}

export interface ChartFigureProps {
  /** Oldest first, evenly spaced. Two or more to draw a line. */
  points: readonly MonthLinePoint[];
  /** Names the chart for a screen reader, as web's hidden figure title ("Net worth over time"). */
  title: string;
  /** The chart's text alternative, read after the title, as web's figure description. */
  summary: string;
  /** The last point's figure, already formatted ("£232,000"), drawn by the end (web's end label). */
  endLabel?: string;
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
 * For the text beside a drawn chart that the chart's spoken name already carries (its summary, a
 * joint account's sentence): shown on screen, skipped by a screen reader, so it is heard once.
 */
export const SAID_BY_CHART = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
} as const;

/**
 * A balance or net worth over the months, as web's `MonthLinePlot` without its axes: straight
 * segments between the engine's point heights, a dashed segment where a month is carried, the
 * latest month marked and labelled with its figure. In the text colour, so a fall has no colour of
 * its own. A screen reader meets one image named by the title and summary, as web's figure is
 * (`aria-labelledby` its title, `aria-describedby` its summary); the drawing inside is hidden.
 */
export function ChartFigure({
  points,
  title,
  summary,
  endLabel,
  testID = "month-line-chart",
}: ChartFigureProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const ink = theme.colors["text.primary"];
  const placed = points.map((p, i) => place(i, points.length, p.fraction, width));
  const last = placed.at(-1);
  const endsLow = (points.at(-1)?.fraction ?? 0) < 0.5;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={[title, summary].filter(Boolean).join(". ")}
      onLayout={onLayout}
      style={styles.root}
      testID={testID}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.drawing}
        testID={`${testID}-drawing`}
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
        {endLabel && points.length > 1 ? (
          <View style={endsLow ? styles.endLabelTop : styles.endLabelBottom}>
            <Text textStyle="label.md" tabular testID={`${testID}-end-label`}>
              {endLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
