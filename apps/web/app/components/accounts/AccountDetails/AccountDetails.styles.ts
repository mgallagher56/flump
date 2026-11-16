import { cva } from "@repo/ui/styled-system/css";

export const detailsRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 },
});

export const returnNumeric = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const returnNote = cva({
  base: { color: "text.secondary", textStyle: "body.sm" },
});
