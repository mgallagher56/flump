import { cva } from "@repo/ui/styled-system/css";

/** The notice's sentences. Dates and pounds sit in the text, so numerals stay tabular. */
export const sentences = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
    "& p": { margin: 0 },
  },
});

export const links = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "4",
    rowGap: "2",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
});

export const link = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    _focusVisible: { outlineWidth: "2px", outlineStyle: "solid", outlineColor: "border.focusRing" },
  },
});
