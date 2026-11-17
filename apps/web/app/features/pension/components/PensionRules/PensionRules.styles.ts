import { cva } from "@repo/ui/styled-system/css";

export const rulesList = cva({
  base: {
    margin: 0,
    pl: "5",
    display: "flex",
    flexDirection: "column",
    gap: "2",
    maxWidth: "65ch",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    listStyleType: "disc",
  },
});
