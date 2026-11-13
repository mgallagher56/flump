import { SlidersHorizontal } from "lucide-react";
import { type FC, type ReactNode, useId, useState, useSyncExternalStore } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../../primitives/Icon";
import {
  splitAdjustButton,
  splitGrid,
  splitLeftControls,
  splitRightContent,
  splitSummaryBar,
  splitSummaryText,
} from "./SimulatorSplitLayout.styles";

const DESKTOP_QUERY = "(min-width: 64em)";

const subscribeDesktop = (notify: () => void) => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", notify);
  return () => mql.removeEventListener("change", notify);
};

const getDesktop = () =>
  typeof window === "undefined" || typeof window.matchMedia !== "function"
    ? true
    : window.matchMedia(DESKTOP_QUERY).matches;

/** Props handed to `renderControlsContainer` when the controls leave the sticky column (under `lg`). */
export interface ControlsContainerRenderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Id for the container so the Adjust control can reference it with `aria-controls`. */
  id: string;
  /** The accessible name for the controls (`controlsLabel`). */
  label: string;
  /** The controls themselves. */
  children: ReactNode;
}

export interface SimulatorSplitLayoutProps {
  /** Parameter controls (sliders and inputs). Sticky left column from `lg`. */
  controls: ReactNode;
  /** Chart and outcome cards. Right column from `lg`. */
  content: ReactNode;
  /**
   * Headline outcome shown in a sticky summary bar under `lg`, next to the Adjust control, so the
   * result stays visible while the controls are open.
   */
  summary?: ReactNode;
  controlsSpan?: 4 | 5;
  /** Accessible name for the controls region. */
  controlsLabel?: string;
  /** Accessible name for the results region. */
  contentLabel?: string;
  /** Text of the control that reveals the parameters under `lg`. Defaults to "Adjust". */
  adjustLabel?: string;
  /** Start with the controls revealed under `lg`. */
  defaultControlsOpen?: boolean;
  /**
   * Replaces the inline reveal under `lg` (for example with a bottom Sheet). Called only below
   * `lg`; from `lg` the controls always render in the sticky column. When omitted, the controls
   * reveal inline above the results.
   */
  renderControlsContainer?: (props: ControlsContainerRenderProps) => ReactNode;
  className?: string;
}

export const SimulatorSplitLayout: FC<SimulatorSplitLayoutProps> = ({
  controls,
  content,
  summary,
  controlsSpan = 5,
  controlsLabel = "Parameters",
  contentLabel = "Results",
  adjustLabel = "Adjust",
  defaultControlsOpen = false,
  renderControlsContainer,
  className,
}) => {
  const contentSpan = controlsSpan === 4 ? 8 : 7;
  const [open, setOpen] = useState(defaultControlsOpen);
  const controlsId = useId();
  const isDesktop = useSyncExternalStore(subscribeDesktop, getDesktop, () => true);
  const custom = !isDesktop && renderControlsContainer !== undefined;

  return (
    <div className={cx(splitGrid(), className)}>
      <div className={splitSummaryBar()} data-testid="simulator-summary-bar">
        <div className={splitSummaryText()}>{summary}</div>
        <button
          aria-controls={controlsId}
          aria-expanded={open}
          className={splitAdjustButton()}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Icon icon={SlidersHorizontal} size="sm" />
          {adjustLabel}
        </button>
      </div>

      {custom ? (
        renderControlsContainer?.({
          open,
          onOpenChange: setOpen,
          id: controlsId,
          label: controlsLabel,
          children: controls,
        })
      ) : (
        <section
          aria-label={controlsLabel}
          className={cx(splitLeftControls({ span: controlsSpan, open }))}
          id={controlsId}
        >
          {controls}
        </section>
      )}
      <section aria-label={contentLabel} className={cx(splitRightContent({ span: contentSpan }))}>
        {content}
      </section>
    </div>
  );
};

export default SimulatorSplitLayout;
