import { sva } from "../../../styled-system/css";

/**
 * E17 5A result card. A plain card on `surface.card` so it stands off the canvas in a saved section
 * and off the fill-less dashed zone alike. The figure is `numeric.result` (36px, tabular). No hero
 * surface, no tint and no accent: the figure is a fact, not a judgement.
 */
export const resultBlock = sva({
  slots: [
    "root",
    "labelRow",
    "label",
    "answer",
    "leadIn",
    "figure",
    "empty",
    "note",
    "row",
    "rowLabel",
    "rowValue",
  ],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "1",
      minWidth: "0",
      backgroundColor: "surface.card",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "border",
      borderRadius: "card",
      boxShadow: "card",
      color: "text.primary",
      px: "5",
      py: "4",
    },
    labelRow: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "1",
    },
    label: {
      margin: "0",
      textStyle: "label.md",
      fontWeight: "semibold",
      color: "text.primary",
    },
    answer: {
      margin: "0",
      display: "flex",
      flexDirection: "column",
    },
    leadIn: {
      textStyle: "body.sm",
      color: "text.secondary",
    },
    figure: {
      textStyle: "numeric.result",
      color: "text.primary",
      overflowWrap: "anywhere",
    },
    empty: {
      margin: "0",
      textStyle: "numeric.unset",
      color: "text.secondary",
    },
    note: {
      margin: "0",
      marginTop: "1",
      textStyle: "body.sm",
      color: "text.secondary",
      maxWidth: "56ch",
    },
    row: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: "3",
      margin: "0",
      marginTop: "3",
      paddingTop: "3",
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      borderTopColor: "border.subtle",
      textStyle: "body.sm",
    },
    rowLabel: { color: "text.secondary" },
    rowValue: {
      margin: "0",
      fontWeight: "semibold",
      fontVariantNumeric: "tabular-nums",
    },
  },
});
