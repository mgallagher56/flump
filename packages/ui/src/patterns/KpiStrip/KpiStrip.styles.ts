import { cva } from "../../../styled-system/css";

export const kpiStripGrid = cva({
  base: {
    display: "grid",
    gap: "16px",
    width: "100%",
  },
  variants: {
    columns: {
      3: { gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" } },
      4: { gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" } },
    },
  },
  defaultVariants: {
    columns: 4,
  },
});
