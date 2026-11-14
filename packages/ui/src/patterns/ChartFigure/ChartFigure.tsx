import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import { cx } from "../../../styled-system/css";
import { CHART_RULES } from "../../charts/chartRules";
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
import { visuallyHiddenRecipe } from "../../primitives/VisuallyHidden/VisuallyHidden.styles";
import {
  chartFigureCaption,
  chartFigureData,
  chartFigureLegend,
  chartFigureNotice,
  chartFigurePrompt,
  chartFigureRoot,
  chartFigureSummary,
  chartFigureTitle,
} from "./ChartFigure.styles";

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

// The chart wrapper is aria-hidden, so nothing inside it may be keyboard focusable (axe
// aria-hidden-focus). Recharts' accessibilityLayer adds tabindex=0 to its svg. We take focusability
// away rather than using `inert`, which would also kill the pointer hover tooltips.
// `active` re-runs the effect when the chart wrapper mounts later (after the too-few-points prompt).
const useRemoveFromTabOrder = (ref: React.RefObject<HTMLElement | null>, active: boolean): void => {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const sweep = (): void => {
      // Only write when the value changes: setAttribute with an unchanged value still queues a
      // mutation record, which would re-trigger this observer in an endless loop.
      for (const el of root.querySelectorAll(FOCUSABLE)) {
        if (el.getAttribute("tabindex") !== "-1") el.setAttribute("tabindex", "-1");
      }
    };
    sweep();
    const observer = new MutationObserver(sweep);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["tabindex"],
    });
    return () => observer.disconnect();
  }, [ref, active]);
};

/** The one point a chart calls out (plan P10.3): the point that answers the page's question. */
export interface ChartAnnotation {
  /** Where the point sits on the x axis, in the chart's own x units (a year, a month key, an age). */
  x: string | number;
  /** Short label drawn beside the point, for example "Paid off, Mar 2030". */
  label: string;
}

/** Chart conventions a `ChartFigure` hands to the chart drawn inside it (read with `useChartFigure`). */
export interface ChartFigureConfig {
  /** Label each series at its line end instead of relying on a legend (up to 3 series). */
  directLabels: boolean;
  /** The single annotation to draw, if any. */
  annotation?: ChartAnnotation;
  /** Most x-axis ticks to draw. Pass to `pickTicks` or the chart library's tick count. */
  maxTicks: number;
}

export const CHART_FIGURE_DEFAULTS = {
  maxTicks: CHART_RULES.maxXTicks,
  minPoints: CHART_RULES.minPoints,
  directLabelMaxSeries: CHART_RULES.directLabelMaxSeries,
} as const;

const ChartFigureContext = createContext<ChartFigureConfig>({
  directLabels: false,
  maxTicks: CHART_FIGURE_DEFAULTS.maxTicks,
});

/**
 * Read the enclosing `ChartFigure`'s conventions from inside a chart component. Outside a
 * `ChartFigure` it returns the defaults (no direct labels, no annotation, 6 ticks).
 */
export const useChartFigure = (): ChartFigureConfig => useContext(ChartFigureContext);

/**
 * Pick at most `maxTicks` evenly spaced values, always keeping the first and last. Returns a copy
 * of the input when it already fits.
 */
export function pickTicks<T>(
  values: readonly T[],
  maxTicks: number = CHART_FIGURE_DEFAULTS.maxTicks,
): T[] {
  const limit = Math.max(2, Number.isFinite(maxTicks) ? Math.trunc(maxTicks) : 6);
  if (values.length <= limit) return [...values];
  const step = (values.length - 1) / (limit - 1);
  const picked: T[] = [];
  for (let i = 0; i < limit; i += 1) {
    picked.push(values[Math.round(i * step)] as T);
  }
  return picked;
}

export const NOT_ENOUGH_DATA_TEXT = "There are not enough figures to draw a chart yet.";

export interface ChartFigureProps {
  title: string;
  /** The title still names the figure for assistive tech, but is not shown (a nearby visible heading exists). */
  hideTitle?: boolean;
  /**
   * Required. One sentence with at most 2 figures that says what the chart shows (plan P10.1).
   * It is the chart's text alternative; `showSummary` also shows it under the title. Callers format
   * numbers with en-GB.
   */
  summary: string;
  /** Heading element for the title, so it follows the page outline. Defaults to h3. */
  headingLevel?: "h2" | "h3" | "h4";
  /** Show the summary visually, directly under the title. Defaults to screen-reader only. */
  showSummary?: boolean;
  /**
   * Opt-in notice slot, shown above the chart. Not drawn unless passed. Under E16 P4 the page owns
   * its one `ProjectionNotice` (at the foot of the first projection region), so new code should
   * not pass a projection notice here; existing callers keep it until their page PR moves it.
   */
  notice?: ReactNode;
  /** A `<ChartLegend>` (or similar key), shown below the chart and exposed to assistive tech. Use for 4 or more series. */
  legend?: ReactNode;
  /** Optional accessible data table, revealed by a quiet "Show data" text button under the chart. */
  dataTable?: ReactNode;
  /** Label up to 3 series at their line ends (P10.2). Read by the chart through `useChartFigure`. */
  directLabels?: boolean;
  /** At most one annotation (P10.3). Read by the chart through `useChartFigure`. */
  annotation?: ChartAnnotation;
  /** Most x-axis ticks (P10.4). Defaults to 6. Read by the chart through `useChartFigure`. */
  maxTicks?: number;
  /**
   * Number of data points the chart would draw. When given and below `minPoints`, the chart and
   * legend are not drawn: the summary shows with a one-line prompt instead (P10.6). Omit it to
   * always draw the chart.
   */
  pointCount?: number;
  /** Fewest points worth drawing. Defaults to 3. */
  minPoints?: number;
  /** The one-line prompt shown instead of a chart with too few points. */
  notEnoughDataText?: string;
  /** The chart itself (for example a Recharts SVG). Hidden from assistive tech. */
  children: ReactNode;
  className?: string;
}

export const ChartFigure: FC<ChartFigureProps> = ({
  title,
  hideTitle = false,
  summary,
  showSummary = false,
  headingLevel = "h3",
  notice,
  legend,
  dataTable,
  directLabels = false,
  annotation,
  maxTicks = CHART_FIGURE_DEFAULTS.maxTicks,
  pointCount,
  minPoints = CHART_FIGURE_DEFAULTS.minPoints,
  notEnoughDataText = NOT_ENOUGH_DATA_TEXT,
  children,
  className,
}) => {
  const Heading = headingLevel;
  const titleId = useId();
  const summaryId = useId();
  const chartRef = useRef<HTMLDivElement>(null);
  const tooFewPoints = pointCount !== undefined && pointCount < minPoints;
  useRemoveFromTabOrder(chartRef, !tooFewPoints);
  // With too few points the summary is the content, so it is always shown.
  const summaryVisible = showSummary || tooFewPoints;
  const hidden = visuallyHiddenRecipe({ focusable: false });

  return (
    <figure
      aria-describedby={summaryId}
      aria-labelledby={titleId}
      className={cx(chartFigureRoot(), className)}
    >
      {/* The figcaption is the figure's first child (valid HTML) and holds the title and the
          summary, so a visible summary sits directly under the title (P10.1). */}
      <figcaption className={hideTitle && !summaryVisible ? hidden : chartFigureCaption()}>
        <Heading className={hideTitle ? hidden : chartFigureTitle()} id={titleId}>
          {title}
        </Heading>
        <p className={summaryVisible ? chartFigureSummary() : hidden} id={summaryId}>
          {summary}
        </p>
      </figcaption>
      {notice ? <div className={chartFigureNotice()}>{notice}</div> : null}
      {tooFewPoints ? (
        <p className={chartFigurePrompt()}>{notEnoughDataText}</p>
      ) : (
        <>
          <ChartFigureContext.Provider value={{ directLabels, annotation, maxTicks }}>
            <div aria-hidden="true" ref={chartRef}>
              {children}
            </div>
          </ChartFigureContext.Provider>
          {legend ? <div className={chartFigureLegend()}>{legend}</div> : null}
        </>
      )}
      {dataTable ? (
        <CollapsibleDrawer title="Show data" variant="quiet">
          <div className={chartFigureData()}>{dataTable}</div>
        </CollapsibleDrawer>
      ) : null}
    </figure>
  );
};

export default ChartFigure;
