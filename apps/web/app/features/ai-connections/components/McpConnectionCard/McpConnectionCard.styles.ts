import { cva } from "@repo/ui/styled-system/css";

/**
 * The card sits in the Security tab, so its sections use the shared settings styles
 * (`sectionCard`, `sectionHeading`, `sectionLead`, `statusText`). These recipes cover only what
 * those do not: the plain fact list, the token form, the new-token value and the token rows.
 */

/** A short plain list of facts about the connection. No boxes, no nested slabs. */
export const factList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    margin: 0,
    paddingLeft: "5",
    listStyleType: "disc",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const actionRow = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3" },
});

export const formStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const formGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "2fr 1fr" },
    gap: "4",
  },
});

export const formActions = cva({
  base: { display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: "2" },
});

/** The raw token, shown once. Monospace and breakable so it never overflows at 375px. */
export const tokenValue = cva({
  base: {
    display: "block",
    marginBlock: "2",
    fontFamily: "mono",
    textStyle: "body.sm",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    wordBreak: "break-all",
  },
});

/** The single muted line at the foot of the AI connections card. */
export const setupNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

/** The tokens, one row each. Rows stack on phones and never scroll sideways. */
export const tokenList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyleType: "none",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    minWidth: 0,
  },
});

export const tokenRow = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", md: "row" },
    alignItems: { base: "flex-start", md: "center" },
    gap: { base: "2", md: "4" },
    paddingBlock: "3",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    minWidth: 0,
    textStyle: "body.sm",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

/** One piece of a token row; the name takes the spare width from `md`. */
export const tokenCell = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2", minWidth: 0 },
  variants: {
    part: {
      name: { md: { flex: "1 1 0" } },
      detail: { md: { flexShrink: 0 } },
      usage: { color: "text.muted", md: { flexShrink: 0 } },
      action: { md: { marginLeft: "auto", flexShrink: 0 } },
    },
  },
  defaultVariants: { part: "detail" },
});

export const tokenLabel = cva({
  base: { textStyle: "label.sm", color: "text.primary", overflowWrap: "anywhere" },
});

export const tokenPrefix = cva({
  base: {
    fontFamily: "mono",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    overflowWrap: "anywhere",
  },
});
