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
}

export const SegmentedTabs: FC<SegmentedTabsProps> = ({
  items,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel = "Navigation tabs",
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
    </Tabs.Root>
  );
};

export default SegmentedTabs;
