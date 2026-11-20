import { cva } from "../../../styled-system/css";

export const debtBorrowingRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    width: "100%",
    minWidth: "0",
  },
});

export const debtBorrowingSection = cva({
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

export const debtBorrowingSectionHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2.5",
  },
});

export const debtBorrowingSectionTitle = cva({
  base: {
    textStyle: "heading.xs",
    color: "text.primary",
    margin: 0,
    fontWeight: "medium",
  },
});

export const debtBorrowingList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
  },
});

export const debtBorrowingRow = cva({
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

export const debtBorrowingRowText = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5",
    minWidth: "0",
  },
});

export const debtBorrowingRowName = cva({
  base: {
    textStyle: "body.sm",
    color: "text.primary",
    margin: 0,
  },
});

export const debtBorrowingRowDetail = cva({
  base: {
    textStyle: "body.xs",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const debtBorrowingRowFigure = cva({
  base: {
    textStyle: "body.sm",
    color: "text.primary",
    margin: 0,
    fontWeight: "semibold",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
});

export const debtBorrowingSummary = cva({
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

export const debtBorrowingSummaryLabel = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
  },
});

export const debtBorrowingSummaryFigure = cva({
  base: {
    textStyle: "heading.xs",
    color: "text.primary",
    margin: 0,
    fontWeight: "semibold",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
});

export const debtBorrowingNote = cva({
  base: {
    textStyle: "body.xs",
    color: "text.muted",
    margin: 0,
  },
});
