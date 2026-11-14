import { cva } from "@repo/ui/styled-system/css";

export const toolsGrid = cva({
  base: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    // Eight tools: 1 column, then 2 from md (four full rows), so no tile is orphaned.
    gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
    gap: "6",
  },
});
