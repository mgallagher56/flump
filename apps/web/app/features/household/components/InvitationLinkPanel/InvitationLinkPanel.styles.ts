import { cva } from "@repo/ui/styled-system/css";

export const linkStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const linkRow = cva({
  base: {
    display: "flex",
    gap: "2",
    alignItems: "stretch",
    flexDirection: { base: "column", sm: "row" },
  },
});

export const linkInput = cva({
  base: { flex: "1", minWidth: "0", fontFamily: "mono" },
});

export const linkNote = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const linkActions = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "3" },
});
