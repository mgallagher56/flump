import { type FC, type ReactNode, useId } from "react";
import { cx } from "../../../styled-system/css";
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
import { visuallyHiddenRecipe } from "../../primitives/VisuallyHidden/VisuallyHidden.styles";
import {
  chartFigureData,
  chartFigureRoot,
  chartFigureSummary,
  chartFigureTitle,
} from "./ChartFigure.styles";

export interface ChartFigureProps {
  title: string;
  /** Text alternative for the chart. Callers format numbers with en-GB. */
  summary: string;
  /** Show the summary visually. Defaults to screen-reader only. */
  showSummary?: boolean;
  /** Optional accessible data table, revealed via a "Show data" drawer. */
  dataTable?: ReactNode;
  /** The chart itself (for example a Recharts SVG). Hidden from assistive tech. */
  children: ReactNode;
  className?: string;
}

export const ChartFigure: FC<ChartFigureProps> = ({
  title,
  summary,
  showSummary = false,
  dataTable,
  children,
  className,
}) => {
  const titleId = useId();
  const summaryId = useId();

  return (
    <figure
      aria-describedby={summaryId}
      aria-labelledby={titleId}
      className={cx(chartFigureRoot(), className)}
    >
      <h3 className={chartFigureTitle()} id={titleId}>
        {title}
      </h3>
      <div aria-hidden="true">{children}</div>
      {/* figcaption must be a direct child of figure, so hide it with the recipe class. */}
      <figcaption
        className={showSummary ? chartFigureSummary() : visuallyHiddenRecipe({ focusable: false })}
        id={summaryId}
      >
        {summary}
      </figcaption>
      {dataTable ? (
        <CollapsibleDrawer title="Show data">
          <div className={chartFigureData()}>{dataTable}</div>
        </CollapsibleDrawer>
      ) : null}
    </figure>
  );
};

export default ChartFigure;
