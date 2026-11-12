import { cva } from "@repo/ui/styled-system/css";

/** Wrapper spacing so the empty state sits in the dashboard rhythm. */
export const emptyStateSlot = cva({
  base: { width: "100%", minWidth: 0 },
});
