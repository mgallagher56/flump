import { cva } from "@repo/ui/styled-system/css";

export const summaryRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const summaryScene = cva({
  base: { display: "flex", justifyContent: "center" },
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
  base: { margin: 0, marginBottom: "1", textStyle: "label.md", color: "text.primary" },
});

export const changesList = cva({
  base: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" },
});

export const changeRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
    py: "2",
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
    gap: "2",
    flexShrink: 0,
    textStyle: "numeric.sm",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

/** Net worth: the label, the summary's largest figure, then the change against last month. */
export const netWorthBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "0.5", minWidth: 0 },
});

export const netWorthLabel = cva({
  base: { margin: 0, textStyle: "label.md", color: "text.secondary" },
});

export const netWorthFigure = cva({
  base: {
    margin: 0,
    textStyle: "numeric.lg",
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
    gap: "2",
    "& > button": { minHeight: "6" },
  },
});
