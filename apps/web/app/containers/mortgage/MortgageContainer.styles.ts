import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    paddingBottom: "48px",
    fontVariantNumeric: "tabular-nums",
    minWidth: 0,
    width: "100%",
  },
});

export const categorySwitch = cva({
  base: {
    margin: 0,
    padding: 0,
    border: "none",
    minWidth: 0,
    display: "inline-flex",
    flexWrap: "wrap",
    gap: "8px",
  },
});

export const tabList = cva({
  base: {
    margin: 0,
    padding: 0,
    display: "flex",
    gap: "4px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    overflowX: "auto",
    minWidth: 0,
  },
});

export const tabButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    px: "14px",
    py: "10px",
    minH: "touch",
    textStyle: "label.md",
    whiteSpace: "nowrap",
    cursor: "pointer",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    marginBottom: "-1px",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
  variants: {
    active: {
      true: { color: "primary", borderBottomColor: "primary" },
      false: {
        color: "text.muted",
        borderBottomColor: "transparent",
        _hover: { color: "text.primary" },
      },
    },
  },
});

export const missingPrompt = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    textStyle: "body.md",
    color: "text.secondary",
  },
});

export const tabPanel = cva({
  base: { display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 },
});
