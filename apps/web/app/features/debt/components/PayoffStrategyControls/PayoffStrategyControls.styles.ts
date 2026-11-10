import { cva } from "@repo/ui/styled-system/css";

export const strategyContainer = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "card",
  },
});

export const strategyCard = cva({
  base: {
    p: "14px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    _hover: {
      borderColor: "border.strong",
    },
  },
  variants: {
    active: {
      true: {
        borderWidth: "2px",
        borderColor: "primary",
        backgroundColor: "primary.subtle",
      },
    },
  },
});
