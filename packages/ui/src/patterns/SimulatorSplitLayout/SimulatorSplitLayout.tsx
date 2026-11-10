import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { splitGrid, splitLeftControls, splitRightContent } from "./SimulatorSplitLayout.styles";

export interface SimulatorSplitLayoutProps {
  controls: ReactNode;
  content: ReactNode;
  controlsSpan?: 4 | 5;
  className?: string;
}

export const SimulatorSplitLayout: FC<SimulatorSplitLayoutProps> = ({
  controls,
  content,
  controlsSpan = 5,
  className,
}) => {
  const contentSpan = controlsSpan === 4 ? 8 : 7;

  return (
    <div className={cx(splitGrid(), className)}>
      <aside className={cx(splitLeftControls({ span: controlsSpan }))}>{controls}</aside>
      <main className={cx(splitRightContent({ span: contentSpan }))}>{content}</main>
    </div>
  );
};

export default SimulatorSplitLayout;
