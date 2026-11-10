import { cva } from "../../../styled-system/css";

export const taxTrapContainer = cva({
  base: {
    borderRadius: "2xl",
    borderWidth: "1px",
    borderStyle: "solid",
    p: { base: "18px 16px", md: "22px 24px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
  },
  variants: {
    inTrap: {
      true: {
        borderColor: "status.danger.border",
        backgroundColor: "status.danger.bg",
      },
      false: {
        borderColor: "status.warning.border",
        backgroundColor: "status.warning.bg",
      },
    },
  },
  defaultVariants: {
    inTrap: true,
  },
});

export const reliefMetricsGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
    gap: "12px",
    pt: "10px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});
