import { cva } from "@repo/ui/styled-system/css";

export const isaRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const isaTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const isaNote = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});
