import { cva } from "../../../styled-system/css";

export const breathingRoomRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "5",
    width: "100%",
    minWidth: "0",
  },
});

export const scenarioControls = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});

export const outcomeCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    p: { base: "4", md: "5" },
    boxShadow: "sm",
  },
});

export const outcomeLabel = cva({
  base: {
    textStyle: "label.md",
    color: "text.secondary",
    margin: 0,
    fontWeight: "medium",
  },
});

export const outcomeHeadline = cva({
  base: {
    textStyle: "heading.lg",
    color: "text.primary",
    margin: 0,
    fontWeight: "bold",
    fontVariantNumeric: "tabular-nums",
  },
});

export const outcomeDescription = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    margin: 0,
  },
});

export const deltaBadge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    textStyle: "body.xs",
    fontWeight: "medium",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const breakdownList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    pt: "3",
    mt: "1",
  },
});

export const breakdownRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
    textStyle: "body.sm",
  },
});

export const breakdownTerm = cva({
  base: {
    color: "text.secondary",
    margin: 0,
  },
});

export const breakdownValue = cva({
  base: {
    color: "text.primary",
    fontWeight: "semibold",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});
