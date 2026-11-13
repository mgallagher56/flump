import { cva } from "@repo/ui/styled-system/css";

export const spacer = cva({
  base: {
    display: { base: "block", lg: "none" },
    height: "calc(72px + env(safe-area-inset-bottom, 0px))",
  },
});
