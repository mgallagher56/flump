import { cva } from "@repo/ui/styled-system/css";

/** The switch row: full width, so the hint wraps under the label. */
export const wellbeingSwitch = cva({
  base: { minWidth: 0 },
});
