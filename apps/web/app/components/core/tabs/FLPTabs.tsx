import * as Tabs from "@radix-ui/react-tabs";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import type { TabData } from "./types";

interface FLPTabsProps {
  data: TabData[];
  orientation?: "horizontal" | "vertical";
}

const FLPTabs: FC<FLPTabsProps> = ({ data, orientation = "horizontal" }) => {
  const listStyle = css({
    display: "flex",
    borderBottom: orientation === "horizontal" ? "1px solid" : "none",
    borderRight: orientation === "vertical" ? "1px solid" : "none",
    borderColor: "border",
    gap: "16px",
    marginBottom: orientation === "horizontal" ? "16px" : "0",
    flexDirection: orientation === "vertical" ? "column" : "row",
  });

  const triggerStyle = css({
    padding: "8px 16px",
    fontSize: "sm",
    fontWeight: "medium",
    color: "text.muted",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "color 0.2s, border-color 0.2s",
    borderBottom: orientation === "horizontal" ? "2px solid transparent" : "none",
    borderRight: orientation === "vertical" ? "2px solid transparent" : "none",
    "&[data-state='active']": {
      color: "primary",
      borderColor: "primary",
    },
    _hover: {
      color: "text.primary",
    },
  });

  const contentStyle = css({
    outline: "none",
  });

  return (
    <Tabs.Root defaultValue={data[0].value} orientation={orientation}>
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
