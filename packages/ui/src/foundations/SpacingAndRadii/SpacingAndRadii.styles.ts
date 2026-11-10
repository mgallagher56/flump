import { cva } from "../../../styled-system/css";

export const gridBox = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "repeat(2, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(6, 1fr)" },
    gap: "16px",
    mt: "12px",
    mb: "32px",
  },
});

export const scaleItem = cva({
  base: {
    p: "14px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "center",
  },
});
