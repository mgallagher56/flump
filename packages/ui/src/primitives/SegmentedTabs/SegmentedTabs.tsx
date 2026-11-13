import * as Tabs from "@radix-ui/react-tabs";
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { cx } from "../../../styled-system/css";
import { segmentedTabPanel, segmentedTabsList, segmentedTabTrigger } from "./SegmentedTabs.styles";

export interface SegmentedTabItem {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedTabsProps {
  items: SegmentedTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  /** Accessible name for the tab list. */
  "aria-label"?: string;
  /**
   * `automatic` (default) selects a tab as soon as arrow keys focus it. Use `manual` when
   * selecting has a cost (unsaved changes, a heavy panel), so arrows only move focus and
   * Enter or Space selects.
   */
  activationMode?: "automatic" | "manual";
  /**
   * Optional panel content per tab value. Every panel stays mounted (so state such as slider
   * values survives a tab change) and the inactive ones are hidden. Rendering the panels here
   * also gives each tab a real `aria-controls` target.
   */
  panels?: Partial<Record<string, ReactNode>>;
  /** Class for each panel wrapper. */
  panelClassName?: string;
  /** `<SegmentedTabs.Panel value="...">` children, rendered below the tab list. */
  children?: ReactNode;
}

interface PanelRegistry {
  setMounted: (value: string, mounted: boolean) => void;
}

const PanelRegistryContext = createContext<PanelRegistry | null>(null);

export interface SegmentedTabPanelProps {
  /** Must match the `value` of one of the tab items. */
  value: string;
  children?: ReactNode;
  className?: string;
  /** Keep the panel content mounted (hidden) while its tab is inactive. */
  keepMounted?: boolean;
  id?: string;
}

interface InternalPanelProps extends SegmentedTabPanelProps {
  hidden?: boolean;
}

/** A tab panel (`role="tabpanel"`, labelled by its tab). Render inside `<SegmentedTabs>`. */
const SegmentedTabPanel: FC<InternalPanelProps> = ({
  value,
  children,
  className,
  keepMounted,
  id,
  hidden,
}) => {
  const registry = useContext(PanelRegistryContext);
  const setMounted = registry?.setMounted;
  // The ref callback fires on mount and unmount of the Radix panel element, so the registry only
  // lists panels that are actually in the DOM.
  const ref = useCallback(
    (node: HTMLDivElement | null) => setMounted?.(value, node !== null),
    [setMounted, value],
  );
  return (
    <Tabs.Content
      ref={ref}
      {...(id ? { id } : {})}
      {...(hidden === undefined ? {} : { hidden })}
      value={value}
      forceMount={keepMounted ? true : undefined}
      className={cx(segmentedTabPanel({ keepMounted: Boolean(keepMounted) }), className)}
    >
      {children}
    </Tabs.Content>
  );
};

/**
 * Segmented tab list on Radix Tabs. Add panels with the `panels` prop or `<SegmentedTabs.Panel>`.
 * A trigger only carries `aria-controls` when a panel for it is in the DOM (Radix keeps inactive
 * panels as hidden empty elements), so there is never a dangling reference (axe
 * `aria-valid-attr-value`), including when used as a bare segmented control.
 */
const SegmentedTabsRoot: FC<SegmentedTabsProps> = ({
  items,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel = "Navigation tabs",
  activationMode = "automatic",
  panels,
  panelClassName,
  children,
}) => {
  // Panels register after mount, so on the server and in the first client render no trigger has
  // `aria-controls`; it is added right after hydration once the panels exist. That is intentional.
  const [mounted, setMountedState] = useState<ReadonlySet<string>>(() => new Set());
  const setMounted = useCallback((panelValue: string, isMounted: boolean) => {
    setMountedState((prev) => {
      if (prev.has(panelValue) === isMounted) return prev;
      const next = new Set(prev);
      if (isMounted) next.add(panelValue);
      else next.delete(panelValue);
      return next;
    });
  }, []);
  const registry = useMemo(() => ({ setMounted }), [setMounted]);

  return (
    <PanelRegistryContext.Provider value={registry}>
      <Tabs.Root
        activationMode={activationMode}
        className={className}
        value={value}
        onValueChange={onValueChange}
      >
        <Tabs.List aria-label={ariaLabel} className={cx(segmentedTabsList())}>
          {items.map((item) => (
            <Tabs.Trigger
              key={item.value}
              className={cx(segmentedTabTrigger())}
              disabled={item.disabled}
              value={item.value}
              // Radix always sets aria-controls; strip it when no panel is mounted for this tab.
              {...(mounted.has(item.value) ? {} : { "aria-controls": undefined })}
            >
              {item.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {panels
          ? items.map((item) =>
              panels[item.value] === undefined ? null : (
                <SegmentedTabPanel
                  key={item.value}
                  keepMounted
                  className={panelClassName}
                  hidden={item.value !== value}
                  value={item.value}
                >
                  {panels[item.value]}
                </SegmentedTabPanel>
              ),
            )
          : null}
        {children}
      </Tabs.Root>
    </PanelRegistryContext.Provider>
  );
};

export const SegmentedTabs = Object.assign(SegmentedTabsRoot, {
  Panel: SegmentedTabPanel as FC<SegmentedTabPanelProps>,
});

export default SegmentedTabs;
