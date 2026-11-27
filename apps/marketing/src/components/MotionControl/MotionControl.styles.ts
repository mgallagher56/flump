import { cva } from "@repo/ui/styled-system/css";

/**
 * The control keeps its place in the server render and with reduced motion, invisible and out of
 * the tab order, so nothing shifts when it appears after hydration.
 */
export const control = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
  },
  variants: {
    available: {
      true: {},
      false: { visibility: "hidden" },
    },
  },
});
