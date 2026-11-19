import { cva } from "@repo/ui/styled-system/css";

/**
 * The error state sits in `PageBody`, which gives it the page gutters and top space (P36, P76);
 * this only adds room below it, so the card never sits on the footer.
 */
export const boundaryRoot = cva({
  base: { paddingBottom: { base: "6", md: "12" } },
});
