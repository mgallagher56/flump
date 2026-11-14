import * as RadixTabs from "@radix-ui/react-tabs";
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cx } from "../../../styled-system/css";
import { tabPanel, tabsList, tabsRoot, tabTrigger } from "./Tabs.styles";

// Replaced statically by the bundler (Vite, Storybook); declared here to avoid a node types dependency.
declare const process: { env: { NODE_ENV?: string } };

/** E16 P5: in-page view switching shows at most this many tabs. */
export const TABS_MAX_ITEMS = 4;

export type TabsSize = "sm" | "md";

export interface TabItem {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  /** Accessible name for the tab list. */
  "aria-label"?: string;
  /**
   * `md` (default) for page-level view switching; `sm` for tool switchers inside a region, such
   * as the `ScenarioZone` tools row.
   */
  size?: TabsSize;
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
  /** `<Tabs.Panel value="...">` children, rendered below the tab list. */
  children?: ReactNode;
}

interface PanelRegistry {
  setMounted: (value: string, mounted: boolean) => void;
}

const PanelRegistryContext = createContext<PanelRegistry | null>(null);

export interface TabPanelProps {
  /** Must match the `value` of one of the tab items. */
  value: string;
  children?: ReactNode;
  className?: string;
  /** Keep the panel content mounted (hidden) while its tab is inactive. */
  keepMounted?: boolean;
  id?: string;
}

interface InternalPanelProps extends TabPanelProps {
  hidden?: boolean;
}

/** A tab panel (`role="tabpanel"`, labelled by its tab). Render inside `<Tabs>`. */
const TabPanel: FC<InternalPanelProps> = ({
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
    <RadixTabs.Content
      ref={ref}
      {...(id ? { id } : {})}
      {...(hidden === undefined ? {} : { hidden })}
      value={value}
      forceMount={keepMounted ? true : undefined}
      className={cx(tabPanel({ keepMounted: Boolean(keepMounted) }), className)}
    >
      {children}
    </RadixTabs.Content>
  );
};

/**
 * The one tabs component (E16 P5): a segmented tab list on Radix Tabs, at most four items (a dev
 * warning fires above that), hidden by the page when there is only one option. Add panels with the
 * `panels` prop or `<Tabs.Panel>`. At 375px a long list scrolls sideways inside itself.
 * A trigger only carries `aria-controls` when a panel for it is in the DOM (Radix keeps inactive
 * panels as hidden empty elements), so there is never a dangling reference (axe
 * `aria-valid-attr-value`), including when used as a bare segmented control.
 */
const TabsRoot: FC<TabsProps> = ({
  items,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel = "Navigation tabs",
  activationMode = "automatic",
  size = "md",
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

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && items.length > TABS_MAX_ITEMS) {
      console.warn(
        `Tabs: ${items.length} items given; show at most ${TABS_MAX_ITEMS} (E16 P5). Move the rest into a menu or a separate page.`,
      );
    }
  }, [items.length]);

  return (
    <PanelRegistryContext.Provider value={registry}>
      <RadixTabs.Root
        activationMode={activationMode}
        className={cx(tabsRoot(), className)}
        value={value}
        onValueChange={onValueChange}
      >
        <RadixTabs.List aria-label={ariaLabel} className={cx(tabsList({ size }))}>
          {items.map((item) => (
            <RadixTabs.Trigger
              key={item.value}
              className={cx(tabTrigger({ size }))}
              disabled={item.disabled}
              value={item.value}
              // Radix always sets aria-controls; strip it when no panel is mounted for this tab.
              {...(mounted.has(item.value) ? {} : { "aria-controls": undefined })}
            >
              {item.label}
            </RadixTabs.Trigger>
          ))}
        </RadixTabs.List>
        {panels
          ? items.map((item) =>
              panels[item.value] === undefined ? null : (
                <TabPanel
                  key={item.value}
                  keepMounted
                  className={panelClassName}
                  hidden={item.value !== value}
                  value={item.value}
                >
                  {panels[item.value]}
                </TabPanel>
              ),
            )
          : null}
        {children}
      </RadixTabs.Root>
    </PanelRegistryContext.Provider>
  );
};

export const Tabs = Object.assign(TabsRoot, {
  Panel: TabPanel as FC<TabPanelProps>,
});

/** @deprecated Renamed to `Tabs` (E16 P5). Kept so existing screens keep compiling. */
export const SegmentedTabs = Tabs;
/** @deprecated Use `TabsProps`. */
export type SegmentedTabsProps = TabsProps;
/** @deprecated Use `TabItem`. */
export type SegmentedTabItem = TabItem;
/** @deprecated Use `TabPanelProps`. */
export type SegmentedTabPanelProps = TabPanelProps;

export default Tabs;
