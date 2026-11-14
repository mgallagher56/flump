import { cva } from "@repo/ui/styled-system/css";

export const summaryRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const summaryHeading = cva({
  base: {
    margin: 0,
    // Focus moves here by script for screen readers; a heading is not a control, so no ring.
    _focus: { outline: "none" },
    _focusVisible: { outline: "none" },
    textStyle: "heading.sm",
    color: "text.primary",
  },
});

export const summarySubheading = cva({
  base: { margin: 0, marginBottom: "4px", textStyle: "label.md", color: "text.primary" },
});

export const changesList = cva({
  base: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" },
});

export const changeRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    py: "8px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    _last: { borderBottomWidth: 0 },
  },
});

export const changeName = cva({
  base: { minWidth: 0, textStyle: "body.sm", color: "text.primary", overflowWrap: "anywhere" },
});

export const changeFigure = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
    textStyle: "numeric.sm",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const summaryLine = cva({
  base: {
    margin: 0,
    textStyle: "body.md",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const summaryActions = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column-reverse", sm: "row" },
    alignItems: { base: "stretch", sm: "center" },
    justifyContent: "space-between",
    gap: "8px",
    "& > button": { minHeight: "6" },
  },
});
