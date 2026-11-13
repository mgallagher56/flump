import { cva } from "../../../styled-system/css";

export const explorerRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", width: "100%" },
});

export const explorerControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const explorerDetails = cva({
  base: { display: "flex", flexDirection: "column", gap: "3" },
});

export const explorerFieldset = cva({
  base: {
    border: "none",
    margin: "0",
    padding: "0",
    display: "flex",
    flexDirection: "column",
    gap: "1",
  },
});

export const explorerLegend = cva({
  base: { textStyle: "label.md", color: "text.primary", marginBottom: "1", padding: "0" },
});

export const explorerContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "5", minWidth: "0" },
});

export const explorerNumeric = cva({
  base: { textStyle: "numeric.lg", fontVariantNumeric: "tabular-nums", color: "text.primary" },
});

export const explorerAction = cva({
  base: { alignSelf: "flex-start" },
});

/** Scenario outcome cards: one column on a phone, two from sm, up to four in a row from lg. */
export const explorerOutcomes = cva({
  base: {
    display: "grid",
    gridTemplateColumns: {
      base: "minmax(0, 1fr)",
      sm: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(4, minmax(0, 1fr))",
    },
    gap: "3",
  },
});

export const explorerUnverified = cva({
  base: {
    margin: "0",
    paddingBlock: "3",
    paddingInline: "4",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.warning.border",
    backgroundColor: "status.warning.bg",
    color: "status.warning.text",
    textStyle: "body.sm",
  },
});
