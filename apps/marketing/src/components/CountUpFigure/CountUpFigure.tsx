import { VisuallyHidden } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { figure } from "./CountUpFigure.styles";
import { FIGURE_FORMATS, type FigureFormat } from "./figureFormats";

export interface CountUpFigureProps {
  /** The fixed sample value. Only a figure beside an "Example" tag may count (MK13). */
  value: number;
  /** Its en-GB format, by name (`figureFormats.ts`). */
  format: FigureFormat;
  /** Where the count starts. Default 0. */
  from?: number;
  className?: string;
  "data-testid"?: string;
}

/**
 * A sample figure tagged "Example" that may count up once, as part of the moment that shows it
 * (`countUpMoment`, MK13). The server HTML holds the final value, and that is all assistive
 * technology hears; the digits that move are hidden from it (MK10). Without a moment (no
 * JavaScript, reduced motion, a story) it simply shows the final value.
 */
export const CountUpFigure: FC<CountUpFigureProps> = ({
  value,
  format,
  from = 0,
  className,
  "data-testid": testId,
}) => {
  const text = FIGURE_FORMATS[format](value);
  return (
    <span className={cx(figure, className)} data-testid={testId}>
      <VisuallyHidden>{text}</VisuallyHidden>
      <span aria-hidden="true" data-count={value} data-count-from={from} data-format={format}>
        {text}
      </span>
    </span>
  );
};
