import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { splitGrid, splitLeftControls, splitRightContent } from "./SimulatorSplitLayout.styles";

export interface SimulatorSplitLayoutProps {
  controls: ReactNode;
  content: ReactNode;
  controlsSpan?: 4 | 5;
  /** Accessible name for the controls region. */
  controlsLabel?: string;
  /** Accessible name for the results region. */
  contentLabel?: string;
  className?: string;
}

export const SimulatorSplitLayout: FC<SimulatorSplitLayoutProps> = ({
  controls,
  content,
  controlsSpan = 5,
  controlsLabel = "Parameters",
  contentLabel = "Results",
  className,
}) => {
  const contentSpan = controlsSpan === 4 ? 8 : 7;

  return (
    <div className={cx(splitGrid(), className)}>
      <section aria-label={controlsLabel} className={cx(splitLeftControls({ span: controlsSpan }))}>
        {controls}
      </section>
      <section aria-label={contentLabel} className={cx(splitRightContent({ span: contentSpan }))}>
        {content}
      </section>
    </div>
  );
};

export default SimulatorSplitLayout;
