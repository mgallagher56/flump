import { cva } from "@repo/ui/styled-system/css";

/** One quiet card: the goals side by side on a wide screen, stacked on a phone. */
export const strip = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    padding: { base: "5", md: "6" },
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    borderRadius: "xl",
  },
});

export const heading = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const goalList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: {
      base: "minmax(0, 1fr)",
      sm: "repeat(2, minmax(0, 1fr))",
      xl: "repeat(4, minmax(0, 1fr))",
    },
    gap: { base: "4", md: "6" },
  },
});

export const goalItem = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", minWidth: 0 },
});

export const goal = cva({
  base: { textStyle: "body.md", fontWeight: "semibold", color: "text.primary", margin: 0 },
});

export const goalLinks = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    // One link per line, the same in every column (coordinator, 26 November 2026).
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
});

/** A standalone link (style guide B5), 44px tall so it is easy to hit. */
export const goalLink = cva({
  base: {
    textStyle: "body.sm",
    fontWeight: "semibold",
    color: "primary",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    minHeight: "11",
    _hover: { color: "primary.emphasis", textDecoration: "underline" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
