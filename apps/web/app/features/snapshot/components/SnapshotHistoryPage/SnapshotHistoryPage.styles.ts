import { cva } from "@repo/ui/styled-system/css";

// Gutters and the page width come from `PageBody`, so the page matches every other page.

/** The chart, its summary and data row: every figure and date in tabular numbers. */
export const sectionStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

/** The quiet drawer holding the change by account. */
export const changesBody = cva({
  base: { minWidth: 0 },
});

/**
 * The hero's "{Month} not recorded yet" link: the hero's own ink, underlined so it reads as a link
 * without colour (never a warning colour). The focus ring is the hero ink too, so it shows on it.
 */
export const heroPromptLink = cva({
  base: {
    color: "inherit",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    borderRadius: "sm",
    _hover: { textDecorationThickness: "2px" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "currentColor",
      outlineOffset: "2px",
    },
  },
});

/** The link button's own inline padding, taken back so it lines up with "Show data". */
export const flushLink = cva({
  base: { marginInline: "-1" },
});
