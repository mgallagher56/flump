import { cva } from "@repo/ui/styled-system/css";

export const recordedReturnRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: { base: "16px", md: "20px" },
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    minWidth: 0,
  },
});

export const recordedReturnHeading = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const recordedReturnList = cva({
  base: { display: "flex", flexDirection: "column", gap: "4px", margin: 0 },
});

export const recordedReturnRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "12px",
    paddingBlock: "4px",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    emphasis: {
      true: {
        borderTopWidth: "1px",
        borderTopStyle: "solid",
        borderTopColor: "border.subtle",
        paddingTop: "8px",
        color: "text.primary",
        fontWeight: "semibold",
      },
    },
  },
});

export const recordedReturnTerm = cva({
  base: { margin: 0, fontVariantNumeric: "tabular-nums" },
});

/** Every figure in the same neutral colour: a fall carries a minus sign, never a colour. */
export const recordedReturnFigure = cva({
  base: {
    margin: 0,
    textStyle: "numeric.sm",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const recordedReturnNote = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});
