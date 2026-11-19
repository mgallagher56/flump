import { cva } from "@repo/ui/styled-system/css";

export const returnsRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const returnsHeading = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const returnsGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
  },
});
