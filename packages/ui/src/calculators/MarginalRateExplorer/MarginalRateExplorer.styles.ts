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
