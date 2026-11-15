import { cva } from "@repo/ui/styled-system/css";

export const outcome = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
});

export const outcomeUnit = cva({
  base: { textStyle: "body.md", color: "text.secondary" },
});

export const actionRow = cva({
  base: { display: "flex" },
});
