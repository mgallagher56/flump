import { cva } from "@repo/ui/styled-system/css";

export const toolsGrid = cva({
  base: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
    gap: "20px",
  },
});
