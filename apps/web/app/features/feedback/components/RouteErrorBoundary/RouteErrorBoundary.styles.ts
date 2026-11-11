import { cva } from "@repo/ui/styled-system/css";

/** Gives the error state breathing room inside the page, whichever route it replaces. */
export const boundaryRoot = cva({
  base: {
    width: "100%",
    paddingX: "16px",
    paddingY: { base: "24px", md: "48px" },
  },
});
