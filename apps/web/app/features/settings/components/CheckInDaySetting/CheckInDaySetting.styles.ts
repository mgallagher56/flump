import { cva } from "@repo/ui/styled-system/css";

/** The day picker: days are dates, so they line up as tabular figures. */
export const dayField = cva({
  base: { fontVariantNumeric: "tabular-nums", minWidth: 0 },
});
