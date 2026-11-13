import { cva } from "@repo/ui/styled-system/css";

export const disabledLink = cva({
  base: {
    cursor: "not-allowed",
    opacity: 0.7,
    textDecoration: "none",
  },
});
