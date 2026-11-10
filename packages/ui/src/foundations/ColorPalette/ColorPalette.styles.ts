import { cva } from "../../../styled-system/css";

export const swatchGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
    gap: "12px",
    mt: "12px",
    mb: "24px",
  },
});

export const swatchCard = cva({
  base: {
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    overflow: "hidden",
    backgroundColor: "surface.card",
    boxShadow: "xs",
  },
});

export const swatchTile = cva({
  base: {
    height: "64px",
    width: "100%",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    p: "6px",
  },
});

export const swatchMeta = cva({
  base: {
    p: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
});
