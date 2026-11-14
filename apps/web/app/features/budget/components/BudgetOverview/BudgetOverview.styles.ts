import { cva } from "@repo/ui/styled-system/css";

/** Hero then strip, at the page's section gap. */
export const overviewRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: { base: "16px", md: "20px" } },
});

/** A link inside the hero's sub-line: the surrounding ink, underlined. */
export const inlineLink = cva({
  base: {
    color: "inherit",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    fontWeight: "semibold",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "sm",
    },
  },
});

/** Every figure on this page is tabular (AGENTS.md section 2). */
export const figure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
