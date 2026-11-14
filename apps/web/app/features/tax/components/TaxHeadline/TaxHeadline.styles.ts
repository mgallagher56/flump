import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const date = cva({
  base: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
});
