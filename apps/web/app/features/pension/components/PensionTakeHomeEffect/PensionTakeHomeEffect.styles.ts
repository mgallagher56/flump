import { cva } from "@repo/ui/styled-system/css";

export const effectRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    fontVariantNumeric: "tabular-nums",
    minWidth: "0",
  },
});

export const effectNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: "0" },
});

export const effectLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

// "No change" at defaults is words, not a figure: body size until an input moves.
export const quietValue = cva({ base: { textStyle: "body.md", color: "text.secondary" } });

export const outcomeSuffix = cva({
  base: { textStyle: "body.md", color: "text.secondary", whiteSpace: "nowrap" },
});
