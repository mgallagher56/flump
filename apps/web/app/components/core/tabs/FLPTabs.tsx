import * as Tabs from "@radix-ui/react-tabs";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { useResponsive } from "~/context/ResponsiveContext";
import type { TabData } from "./types";

export interface FLPTabsProps {
  data: TabData[];
  orientation?: "horizontal" | "vertical";
  isMobile?: boolean;
  variant?: "default" | "mobile" | "segmented";
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

const FLPTabs: FC<FLPTabsProps> = ({
  data,
  orientation = "horizontal",
  isMobile: propIsMobile,
  variant = "default",
  value,
  onValueChange,
  defaultValue,
}) => {
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const isSegmented = variant === "segmented";

  const listStyle = isSegmented
    ? css({
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: "surface.sunken",
        padding: "4px",
        borderRadius: "xl",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "border.subtle",
        gap: "4px",
        maxWidth: "100%",
        overflowX: "auto",
        marginBottom: "20px",
      })
    : css({
        display: "flex",
        borderBottom: orientation === "horizontal" ? "1px solid" : "none",
        borderRight: orientation === "vertical" ? "1px solid" : "none",
        borderColor: "border",
        gap: isMobileVariant ? "8px" : "16px",
        marginBottom: orientation === "horizontal" ? "16px" : "0",
        flexDirection: orientation === "vertical" ? "column" : "row",
        overflowX: isMobileVariant && orientation === "horizontal" ? "auto" : undefined,
        scrollbarWidth: isMobileVariant ? "none" : undefined,
      });

  const triggerStyle = isSegmented
    ? css({
        padding: "8px 18px",
        minHeight: "38px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        whiteSpace: "nowrap",
        fontSize: "sm",
        fontWeight: "medium",
        color: "text.muted",
        backgroundColor: "transparent",
        borderRadius: "lg",
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s ease",
        "&[data-state='active']": {
          backgroundColor: "surface",
          color: "text.primary",
          fontWeight: "semibold",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
        },
        _hover: {
          color: "text.primary",
        },
        _focusVisible: {
          outline: "2px solid",
          outlineColor: "primary",
          outlineOffset: "2px",
        },
      })
    : css({
        padding: isMobileVariant ? "10px 16px" : "8px 16px",
        minHeight: isMobileVariant ? "44px" : "40px",
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        fontSize: "sm",
        fontWeight: "medium",
        color: "text.muted",
        backgroundColor: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "color 0.15s ease, border-color 0.15s ease",
        borderBottom: orientation === "horizontal" ? "2px solid transparent" : "none",
        borderRight: orientation === "vertical" ? "2px solid transparent" : "none",
        marginBottom: orientation === "horizontal" ? "-1px" : "0",
        "&[data-state='active']": {
          color: "primary",
          borderColor: "primary",
          fontWeight: "semibold",
        },
        _hover: {
          color: "text.primary",
        },
        _focusVisible: {
          outline: "2px solid",
          outlineColor: "primary",
          outlineOffset: "2px",
        },
      });

  const contentStyle = css({
    outline: "none",
  });

  return (
    <Tabs.Root
      data-variant={isMobileVariant ? "mobile" : "desktop"}
      defaultValue={defaultValue ?? data[0]?.value}
      value={value}
      onValueChange={onValueChange}
      orientation={orientation}
    >
      <Tabs.List className={listStyle}>
        {data.map((item) => (
          <Tabs.Trigger
            key={item.value}
            className={triggerStyle}
            disabled={item.disabled}
            value={item.value}
          >
            {item.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {data.map((item) => (
        <Tabs.Content key={item.value} className={contentStyle} value={item.value}>
          {item.children}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
};

export default FLPTabs;
