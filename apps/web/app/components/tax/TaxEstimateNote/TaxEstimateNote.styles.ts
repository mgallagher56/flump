import { cva } from "@repo/ui/styled-system/css";

export const taxEstimateNote = cva({
  base: {
    margin: 0,
    fontSize: "xs",
    lineHeight: 1.5,
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});
