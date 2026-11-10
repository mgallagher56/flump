import { cva } from "../../../styled-system/css";

export const baselineBarContainer = cva({
  base: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    p: "10px 16px",
    mb: "16px",
    backgroundColor: "surface.card",
    boxShadow: "xs",
    transition: "all 0.2s ease",
  },
  variants: {
    active: {
      true: {
        backgroundColor: "primary.subtle",
        borderColor: "primary",
        boxShadow: "0 4px 16px rgba(99, 102, 241, 0.12)",
      },
    },
  },
});

export const baselineSummaryRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
});
