import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "3", minWidth: 0 },
});

export const header = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "3",
  },
});

export const heading = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const list = cva({
  base: { listStyle: "none", margin: 0, padding: 0 },
});
