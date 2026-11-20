import { cva } from "../../../styled-system/css";

export const savingsPensionRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    width: "100%",
    minWidth: "0",
  },
});

export const savingsPensionSection = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    p: "4",
  },
});

export const savingsPensionSectionHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2.5",
  },
});

export const savingsPensionSectionTitle = cva({
  base: {
    textStyle: "heading.xs",
    color: "text.primary",
    margin: 0,
    fontWeight: "medium",
  },
});

export const savingsPensionList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
  },
});

export const savingsPensionRow = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "3",
    py: "2",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    _first: { borderTopWidth: "0" },
  },
});

export const savingsPensionRowText = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5",
    minWidth: "0",
  },
});

export const savingsPensionRowName = cva({
  base: {
    textStyle: "body.sm",
    color: "text.primary",
    margin: 0,
  },
});

export const savingsPensionRowDetail = cva({
  base: {
    textStyle: "body.xs",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const savingsPensionRowFigure = cva({
  base: {
    textStyle: "body.sm",
    color: "text.primary",
    margin: 0,
    fontWeight: "semibold",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
});

export const savingsPensionSummary = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "3",
    pt: "3",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border",
  },
});

export const savingsPensionSummaryLabel = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
  },
});

export const savingsPensionSummaryFigure = cva({
  base: {
    textStyle: "heading.xs",
    color: "text.primary",
    margin: 0,
    fontWeight: "semibold",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
});

export const savingsPensionNote = cva({
  base: {
    textStyle: "body.xs",
    color: "text.muted",
    margin: 0,
  },
});
