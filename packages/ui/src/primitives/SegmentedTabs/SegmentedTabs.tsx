import * as Tabs from "@radix-ui/react-tabs";
import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { segmentedTabsList, segmentedTabTrigger } from "./SegmentedTabs.styles";

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
  "aria-label"?: string;
  /**
   * Optional panel content per tab value. Every panel stays mounted (so state such as slider
   * values survives a tab change) and the inactive ones are hidden. Rendering the panels here
   * also gives each tab a real `aria-controls` target.
   */
  panels?: Partial<Record<string, ReactNode>>;
  /** Class for each panel wrapper. */
  panelClassName?: string;
}

export const SegmentedTabs: FC<SegmentedTabsProps> = ({
  items,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel = "Navigation tabs",
  panels,
  panelClassName,
}) => {
  return (
    <Tabs.Root
      aria-label={ariaLabel}
      className={className}
      value={value}
      onValueChange={onValueChange}
    >
      <Tabs.List className={cx(segmentedTabsList())}>
        {items.map((item) => (
          <Tabs.Trigger
            key={item.value}
            className={cx(segmentedTabTrigger())}
            disabled={item.disabled}
            value={item.value}
          >
            {item.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {panels
        ? items.map((item) =>
            panels[item.value] === undefined ? null : (
              <Tabs.Content
                key={item.value}
                forceMount
                className={panelClassName}
                hidden={item.value !== value}
                value={item.value}
              >
                {panels[item.value]}
              </Tabs.Content>
            ),
          )
        : null}
    </Tabs.Root>
  );
};

export default SegmentedTabs;
