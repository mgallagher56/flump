import { cva } from "../../../styled-system/css";

export const elevationGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
    gap: "24px",
  },
});

export const elevationCard = cva({
  base: {
    p: "density.cardPad",
    minHeight: "112px",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
  variants: {
    level: {
      xs: { backgroundColor: "surface.card", boxShadow: "xs" },
      card: { backgroundColor: "surface.card", boxShadow: "card" },
      raised: { backgroundColor: "surface.card", boxShadow: "raised" },
      overlay: { backgroundColor: "surface.overlay", boxShadow: "overlay" },
      focus: { backgroundColor: "surface.card", boxShadow: "focus" },
    },
  },
});
