import { cva } from "../../../styled-system/css";

export const checkInRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    width: "100%",
    minWidth: "0",
  },
});

export const checkInProgress = cva({
  base: {
    textStyle: "label.sm",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const checkInCardSurface = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    p: { base: "4", md: "5" },
    boxShadow: "sm",
  },
});

export const checkInHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
    flexWrap: "wrap",
  },
});

export const checkInAccountName = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    fontWeight: "semibold",
  },
});

export const checkInBalanceLine = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const checkInInputRow = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
  },
});

export const checkInActions = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2.5",
    flexWrap: "wrap",
    pt: "1",
  },
});

export const checkInNav = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
    pt: "2",
  },
});

export const checkInSummaryList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "2.5",
  },
});

export const checkInSummaryItem = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    p: "2.5",
    borderRadius: "md",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const summaryItemName = cva({
  base: {
    textStyle: "body.sm",
    color: "text.primary",
    fontWeight: "medium",
  },
});

export const summaryItemFigure = cva({
  base: {
    textStyle: "body.sm",
    color: "text.primary",
    fontWeight: "semibold",
    fontVariantNumeric: "tabular-nums",
  },
});
