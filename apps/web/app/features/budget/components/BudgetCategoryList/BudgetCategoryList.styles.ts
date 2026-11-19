import { cva, sva } from "@repo/ui/styled-system/css";

export const categoryList = sva({
  slots: ["header", "title", "list", "item", "row", "identity", "icon", "text", "name", "meta"],
  base: {
    header: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: "3",
      flexWrap: "wrap",
      mb: "3",
    },
    title: { margin: "0", textStyle: "heading.sm", color: "text.primary" },
    list: { listStyle: "none", margin: "0", p: "0" },
    item: {
      "&:not(:last-child)": {
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: "border.subtle",
      },
    },
    row: {
      display: "flex",
      alignItems: "center",
      gap: "2",
      width: "100%",
      py: "3",
      px: "2",
      mx: "-2",
      boxSizing: "content-box",
      textAlign: "left",
      cursor: "pointer",
      background: "transparent",
      border: "none",
      borderRadius: "md",
      color: "text.primary",
      textDecoration: "none",
      _hover: { backgroundColor: "surface.subtle" },
      _focusVisible: {
        outline: "2px solid",
        outlineColor: "border.focusRing",
        outlineOffset: "2px",
      },
    },
    identity: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "3",
      width: "100%",
    },
    icon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: "text.secondary",
      flexShrink: 0,
    },
    text: { display: "flex", alignItems: "center", gap: "3", minWidth: 0, flex: 1 },
    // The group name reads as a heading, so it carries more weight than the entries under it.
    name: { display: "flex", flexDirection: "column", minWidth: 0, textStyle: "label.md" },
    meta: { textStyle: "body.sm", color: "text.secondary", fontWeight: "normal" },
  },
});

export const rowEnd = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
    fontWeight: "semibold",
  },
});

export const chevron = cva({
  base: { display: "inline-flex", color: "text.muted" },
  variants: { open: { true: { transform: "rotate(180deg)" }, false: {} } },
});

/**
 * An open category's own row (owner item 33c): a tinted band, so the category reads as the
 * heading of the entries under it. Semantic tokens, so it follows light and dark.
 */
export const openRow = cva({
  base: { bg: "surface.subtle" },
});

/**
 * The opened entries, indented under their category behind a strong left rule, in smaller,
 * quieter text than the category, so the two never read as the same level.
 */
export const entriesPanel = cva({
  base: {
    mt: "2",
    mb: "3",
    ml: { base: "4", md: "6" },
    pl: { base: "3", md: "4" },
    pr: "2",
    py: "1",
    borderLeftWidth: "3px",
    borderLeftStyle: "solid",
    borderLeftColor: "border.strong",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const listFoot = cva({
  base: {
    display: "flex",
    pt: "4",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});
