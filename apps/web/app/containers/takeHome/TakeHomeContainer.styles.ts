import { cva } from "@repo/ui/styled-system/css";

/** PageBody supplies width, gutters and the section gap; this only keeps space under the zone. */
export const pageRoot = cva({
  base: { paddingBottom: "48px", minWidth: 0 },
});
