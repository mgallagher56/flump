import { cva } from "@repo/ui/styled-system/css";

/** A quiet line in the page: no card, no status colour, no icon. */
export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", minWidth: 0 },
});

/** Dates and pounds sit in the text, so numerals stay tabular. */
export const text = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const details = cva({
  base: { display: "flex", flexDirection: "column", gap: "2" },
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
    textStyle: "body.sm",
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
