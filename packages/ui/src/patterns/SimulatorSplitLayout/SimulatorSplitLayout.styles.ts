import { cva } from "../../../styled-system/css";

export const splitGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "repeat(12, 1fr)" },
    gap: "24px",
    alignItems: "start",
    width: "100%",
  },
});

export const splitLeftControls = cva({
  base: {
    gridColumn: { base: "span 1", lg: "span 5" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    position: { lg: "sticky" },
    top: { lg: "16px" },
  },
  variants: {
    span: {
      4: { gridColumn: { base: "span 1", lg: "span 4" } },
      5: { gridColumn: { base: "span 1", lg: "span 5" } },
    },
  },
  defaultVariants: {
    span: 5,
  },
});

export const splitRightContent = cva({
  base: {
    gridColumn: { base: "span 1", lg: "span 7" },
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  variants: {
    span: {
      7: { gridColumn: { base: "span 1", lg: "span 7" } },
      8: { gridColumn: { base: "span 1", lg: "span 8" } },
    },
  },
  defaultVariants: {
    span: 7,
  },
});
