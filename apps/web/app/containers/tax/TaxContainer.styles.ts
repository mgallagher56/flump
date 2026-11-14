import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6",
    width: "100%",
    minWidth: 0,
    paddingBottom: { base: "6", md: "12" },
    // No page-wide tabular-nums: Inter's tnum feature also widens the hyphen, so words such as
    // "Self-employed" read "Self - employed". Each figure sets tabular-nums itself (Money, KPI).
  },
});

export const numeric = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const drawers = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", minWidth: 0 },
});

export const quietAction = cva({
  base: { marginTop: "3", fontVariantNumeric: "tabular-nums" },
});

export const errorText = cva({
  base: { textStyle: "body.sm", color: "text.primary", margin: 0 },
});

export const textLink = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    "& a": {
      color: "primary",
      textDecoration: "underline",
      _focusVisible: {
        outline: "2px solid",
        outlineColor: "border.focusRing",
        outlineOffset: "2px",
      },
    },
  },
});
