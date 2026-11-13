import { type FC, type ReactNode, useEffect, useId, useRef } from "react";
import { cx } from "../../../styled-system/css";
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
import { visuallyHiddenRecipe } from "../../primitives/VisuallyHidden/VisuallyHidden.styles";
import {
  chartFigureData,
  chartFigureLegend,
  chartFigureNotice,
  chartFigureRoot,
  chartFigureSummary,
  chartFigureTitle,
} from "./ChartFigure.styles";

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

// The chart wrapper is aria-hidden, so nothing inside it may be keyboard focusable (axe
// aria-hidden-focus). Recharts' accessibilityLayer adds tabindex=0 to its svg. We take focusability
// away rather than using `inert`, which would also kill the pointer hover tooltips.
const useRemoveFromTabOrder = (ref: React.RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
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
  }, [ref]);
};

export interface ChartFigureProps {
  title: string;
  /** The title still names the figure for assistive tech, but is not shown (a nearby visible heading exists). */
  hideTitle?: boolean;
  /** Text alternative for the chart. Callers format numbers with en-GB. */
  summary: string;
  /** Show the summary visually. Defaults to screen-reader only. */
  showSummary?: boolean;
  /** Sample-data or projection notice (for example `<ProjectionNotice>`), shown above the chart. */
  notice?: ReactNode;
  /** A `<ChartLegend>` (or similar key), shown below the chart and exposed to assistive tech. */
  legend?: ReactNode;
  /** Optional accessible data table, revealed via a "Show data" drawer. */
  dataTable?: ReactNode;
  /** The chart itself (for example a Recharts SVG). Hidden from assistive tech. */
  children: ReactNode;
  className?: string;
}

export const ChartFigure: FC<ChartFigureProps> = ({
  title,
  hideTitle = false,
  summary,
  showSummary = false,
  notice,
  legend,
  dataTable,
  children,
  className,
}) => {
  const titleId = useId();
  const summaryId = useId();
  const chartRef = useRef<HTMLDivElement>(null);
  useRemoveFromTabOrder(chartRef);

  return (
    <figure
      aria-describedby={summaryId}
      aria-labelledby={titleId}
      className={cx(chartFigureRoot(), className)}
    >
      <h3
        className={hideTitle ? visuallyHiddenRecipe({ focusable: false }) : chartFigureTitle()}
        id={titleId}
      >
        {title}
      </h3>
      {notice ? <div className={chartFigureNotice()}>{notice}</div> : null}
      <div aria-hidden="true" ref={chartRef}>
        {children}
      </div>
      {legend ? <div className={chartFigureLegend()}>{legend}</div> : null}
      {/* figcaption must be a direct child of figure, so hide it with the recipe class. */}
      <figcaption
        className={showSummary ? chartFigureSummary() : visuallyHiddenRecipe({ focusable: false })}
        id={summaryId}
      >
        {summary}
      </figcaption>
      {dataTable ? (
        <CollapsibleDrawer closedLabel="" openLabel="" title="Show data">
          <div className={chartFigureData()}>{dataTable}</div>
        </CollapsibleDrawer>
      ) : null}
    </figure>
  );
};

export default ChartFigure;
