import { cva } from "@repo/ui/styled-system/css";

export const outcome = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
});

export const outcomeLabel = cva({
  base: { textStyle: "label.md", color: "text.secondary", margin: 0 },
});

export const outcomeValue = cva({
  base: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: "8px",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const outcomeUnit = cva({
  base: { textStyle: "body.md", color: "text.secondary" },
});

export const actionRow = cva({
  base: { display: "flex", marginTop: "8px" },
});
