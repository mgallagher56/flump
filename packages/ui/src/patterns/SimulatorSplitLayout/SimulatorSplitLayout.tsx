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
   * result stays visible while the controls are open. Only when `summary` is provided do the
   * controls collapse under `lg`; without it they stay visible, stacked above the results.
   *
   * Sticky offset: the bar and the sticky column read the CSS custom property
   * `--app-header-offset` (fallback 0) so they sit below a sticky app header. Set it on a wrapper,
   * for example `css({ "--app-header-offset": "64px" })`.
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
   * reveal inline above the results. Only used together with `summary`.
   *
   * Note: the controls are mounted in one place at a time, so crossing the `lg` breakpoint
   * remounts them (local state inside the controls is lost; keep parameter state in the parent).
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
  const hasSummary = summary !== undefined && summary !== null && summary !== false;
  const custom = hasSummary && !isDesktop && renderControlsContainer !== undefined;

  return (
    <div className={cx(splitGrid(), className)}>
      {hasSummary && (
        <div className={splitSummaryBar()} data-testid="simulator-summary-bar">
          <div className={splitSummaryText()}>{summary}</div>
          <button
            // The container always exists inline; with a custom container it may only exist open.
            aria-controls={custom && !open ? undefined : controlsId}
            aria-expanded={open}
            className={splitAdjustButton()}
            type="button"
            onClick={() => setOpen((prev) => !prev)}
          >
            <Icon icon={SlidersHorizontal} size="sm" />
            {adjustLabel}
          </button>
        </div>
      )}

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
          className={cx(splitLeftControls({ span: controlsSpan, collapsed: hasSummary && !open }))}
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
