import { cva } from "@repo/ui/styled-system/css";

export const chartWrap = cva({
  base: {
    height: { base: "240px", md: "320px" },
    width: "100%",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});
