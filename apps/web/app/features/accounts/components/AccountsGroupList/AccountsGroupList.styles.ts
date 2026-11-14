import { cva } from "@repo/ui/styled-system/css";

export const listRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: { base: "24px", md: "32px" },
    minWidth: 0,
  },
});

export const group = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});

export const groupHeader = cva({
  base: { display: "flex", alignItems: "center", gap: "8px" },
});

export const groupTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const accountCell = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
});

export const accountLink = cva({
  base: {
    textStyle: "label.md",
    color: "text.primary",
    textDecoration: "underline",
    textDecorationColor: "border.strong",
    textUnderlineOffset: "3px",
    borderRadius: "sm",
    overflowWrap: "anywhere",
    _hover: { color: "primary", textDecorationColor: "currentColor" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const typeCell = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const mutedText = cva({
  base: { color: "text.muted", textStyle: "body.sm" },
});

/** A total line under a table. A real top border, so it survives forced colours. */
export const totalRow = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "16px",
    margin: 0,
    paddingBlock: "16px",
    paddingInline: "16px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border",
    fontVariantNumeric: "tabular-nums",
    "& dd": { margin: 0 },
  },
  variants: {
    emphasis: { true: { borderTopWidth: 0 } },
  },
});

export const totalLabel = cva({
  base: { textStyle: "label.md", color: "text.primary" },
  variants: {
    emphasis: { true: { textStyle: "heading.sm" } },
  },
});

export const note = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, maxWidth: "65ch" },
});

/** Name plus, on a phone, the type underneath (the Type column is hidden while stacked). */
export const accountName = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const phoneType = cva({
  base: {
    display: { base: "block", md: "none" },
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

/** Hides the Type cell while the table is stacked; outranks the stacked table's cell rule. */
export const typeColumn = cva({
  base: { "table tbody tr &": { display: { base: "none", md: "table-cell" } } },
});

/** The ISA row's link to its allowance, under the account name at every width. */
export const isaLink = cva({
  base: {
    textStyle: "body.sm",
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    width: "fit-content",
    borderRadius: "sm",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

/** Net worth and the one line under it about what counts. */
export const netWorthBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
});
