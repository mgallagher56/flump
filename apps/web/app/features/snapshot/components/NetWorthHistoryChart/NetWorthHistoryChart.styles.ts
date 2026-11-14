import { cva } from "@repo/ui/styled-system/css";

export const chartWrap = cva({
  base: {
    height: { base: "240px", md: "320px" },
    width: "100%",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

/** The end-point label on the chart (SVG text takes a class for its type size). */
export const directLabel = cva({
  base: { fontSize: "sm", fontWeight: "semibold" },
});

/** The figure and its data row, spaced like the figure's own parts. */
export const chartStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

/**
 * "Show data" and the page's quiet links on one row. The quiet drawer's own container is flattened
 * (`display: contents`) so its trigger sits in the row and its table opens full width below it.
 */
export const dataRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: "6",
    rowGap: "1",
    minWidth: 0,
    "& > div:first-child:not(:last-child)": { display: "contents" },
    // The drawer's table: after every link in the row, on its own full-width line.
    "& > div:first-child:not(:last-child) > div": { order: 2, flexBasis: "100%", minWidth: 0 },
  },
});

/**
 * The page's links and text after "Show data", flattened into the row so each item wraps on its own
 * (the link stays beside "Show data" at 375). They come before the opened table.
 */
export const dataRowEnd = cva({
  base: { display: "contents", "& > *": { order: 1 } },
});

/**
 * A quiet text link with the same look as the "Show data" trigger: small semibold primary text,
 * no indent, underlined on hover, a full touch target.
 */
export const quietLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "touch",
    px: "1",
    mx: "-1",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "md",
    cursor: "pointer",
    textStyle: "label.sm",
    fontWeight: "semibold",
    color: "primary",
    textDecoration: "none",
    _hover: { textDecoration: "underline", textUnderlineOffset: "3px" },
    _disabled: { color: "text.muted", cursor: "not-allowed", textDecoration: "none" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

/** Quiet text at the end of the data row ("Next check-in: 1 December 2026"). */
export const dataRowNote = cva({
  base: {
    margin: 0,
    marginLeft: "auto",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});
