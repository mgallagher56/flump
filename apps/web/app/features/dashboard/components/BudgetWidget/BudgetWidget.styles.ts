import { cva } from "@repo/ui/styled-system/css";

export const runwayRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    fontVariantNumeric: "tabular-nums",
  },
});

export const spendingBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "6px" },
});
