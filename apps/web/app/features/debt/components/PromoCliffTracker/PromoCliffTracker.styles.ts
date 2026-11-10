import { cva } from "@repo/ui/styled-system/css";

export const promoCliffContainer = cva({
  base: {
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.danger.border",
    backgroundColor: "status.danger.bg",
    p: { base: "14px 16px", md: "16px 20px" },
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
});
