import { cva } from "@repo/ui/styled-system/css";

/** Hero then strip, at the page's 32px section gap, as on every other page (P13). */
export const overviewRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "page.section" },
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

/** Visual equation connector linking Money in − Going out = Left over. */
export const equationBar = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    alignSelf: "center",
    py: "1.5",
    px: "4",
    bg: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "full",
    textStyle: "label.sm",
    color: "text.secondary",
  },
});

export const equationTerm = cva({
  base: { color: "text.primary", fontWeight: "medium" },
});

export const equationOp = cva({
  base: { color: "text.muted", fontWeight: "semibold" },
});

export const equationResult = cva({
  base: { color: "primary", fontWeight: "semibold" },
});
