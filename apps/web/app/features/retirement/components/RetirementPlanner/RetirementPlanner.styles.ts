import { cva } from "@repo/ui/styled-system/css";

export const plannerStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6",
  },
});

export const controlsCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    p: "5",
    borderRadius: "xl",
    bg: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const resultsStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});

export const fieldGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "4",
  },
});

export const promptLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    fontWeight: "medium",
    fontSize: "sm",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const fieldGroup = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5",
  },
});

export const fieldLabel = cva({
  base: {
    fontSize: "sm",
    fontWeight: "medium",
    color: "text.secondary",
  },
});

export const inputControl = cva({
  base: {
    width: "full",
    px: "3",
    py: "2",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    bg: "surface.canvas",
    color: "text.primary",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "1px",
    },
  },
});

export const toggleRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "2",
  },
});

export const budgetLinesList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    mt: "2",
  },
});

export const budgetLineItem = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "3",
    p: "3",
    borderRadius: "md",
    bg: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const budgetLineName = cva({
  base: {
    fontSize: "sm",
    fontWeight: "medium",
    color: "text.primary",
  },
});

export const budgetLineAmount = cva({
  base: {
    fontSize: "sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const scheduleTable = cva({
  base: {
    width: "full",
    borderCollapse: "collapse",
    fontSize: "sm",
    fontVariantNumeric: "tabular-nums",
  },
});

export const scheduleCell = cva({
  base: {
    py: "2",
    px: "3",
    textAlign: "left",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderColor: "border.subtle",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const scheduleHeaderCell = cva({
  base: {
    py: "2",
    px: "3",
    textAlign: "left",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderColor: "border.strong",
    color: "text.secondary",
    fontWeight: "semibold",
    fontSize: "xs",
  },
});

export const mutedNote = cva({
  base: {
    fontSize: "sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

/** Keeps the neutral allowance badge on the note's line, beside its sentence. */
export const allowanceBadge = cva({ base: { verticalAlign: "middle" } });
