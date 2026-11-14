import { cva } from "@repo/ui/styled-system/css";

export const widgetCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    boxShadow: "card",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
    height: "100%",
  },
});

export const widgetHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
    marginBottom: "4px",
  },
});

export const widgetTitle = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    minWidth: 0,
    overflowWrap: "anywhere",
  },
});

export const widgetLabel = cva({
  base: { textStyle: "label.sm", color: "text.secondary", margin: 0 },
});

export const widgetFigure = cva({
  base: {
    textStyle: "numeric.lg",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
    overflowWrap: "anywhere",
  },
});

/** "Not set": body size, muted, never larger or heavier than a real value (E16 P3.1). */
export const widgetUnset = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const widgetLine = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, flex: 1 },
});

export const widgetFooter = cva({
  base: { display: "flex", alignItems: "center", marginTop: "4px", marginLeft: "-8px" },
});

export const widgetLock = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    paddingX: "8px",
    minHeight: "32px",
    color: "text.secondary",
  },
});
