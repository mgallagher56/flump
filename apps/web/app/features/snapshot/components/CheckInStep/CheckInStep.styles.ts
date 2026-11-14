import { cva } from "@repo/ui/styled-system/css";

export const stepRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});

export const stepHead = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const stepName = cva({
  base: {
    margin: 0,
    // Focus moves here by script for screen readers; a heading is not a control, so no ring.
    _focus: { outline: "none" },
    _focusVisible: { outline: "none" },
    textStyle: "label.md",
    color: "text.primary",
    overflowWrap: "anywhere",
  },
  variants: {
    layout: {
      card: { textStyle: "heading.sm" },
      row: {},
    },
  },
});

export const stepMeta = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const doneRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px",
    minWidth: 0,
  },
});

export const doneStatus = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

/** The calculated figure and its lines: flat on the step's own surface, no box inside the card. */
export const calculatedBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "4px" },
});

export const calculatedFigure = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    margin: 0,
  },
});

export const calculatedValue = cva({
  base: { textStyle: "numeric.md", color: "text.primary", fontVariantNumeric: "tabular-nums" },
});

export const quietLine = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const fieldLabel = cva({
  base: { display: "block", marginBottom: "4px", textStyle: "label.sm", color: "text.primary" },
});

/** The step's buttons at their own width on both layouts, so each looks the same on a phone. */
export const actions = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
  },
  variants: {
    layout: {
      card: {},
      row: {},
    },
  },
});

/** The field and its buttons: stacked on a card, one line in a desktop row. */
export const controls = cva({
  base: { display: "flex", gap: "8px", minWidth: 0 },
  variants: {
    layout: {
      card: { flexDirection: "column", gap: "12px" },
      row: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
    },
  },
});

export const fieldWrap = cva({
  base: { minWidth: 0 },
  variants: {
    layout: {
      card: {},
      row: { flex: "1 1 9rem", minWidth: "9rem" },
    },
  },
});
