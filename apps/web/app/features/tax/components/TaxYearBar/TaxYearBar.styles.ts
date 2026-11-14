import { cva } from "@repo/ui/styled-system/css";

export const bar = cva({
  base: { display: "flex", alignItems: "center", gap: "2", minWidth: 0 },
});

export const label = cva({
  base: { textStyle: "label.md", color: "text.secondary", whiteSpace: "nowrap" },
});

export const select = cva({
  base: { fontVariantNumeric: "tabular-nums", minWidth: "8rem" },
});
