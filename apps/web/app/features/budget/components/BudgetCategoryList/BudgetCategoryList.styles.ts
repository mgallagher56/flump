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
    // The group name carries more weight than the entries opened under it.
    name: { display: "flex", flexDirection: "column", minWidth: 0, fontWeight: "semibold" },
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

/** The opened entries, clearly indented and nested under their category. */
export const entriesPanel = cva({
  base: {
    mt: "1",
    mb: "3",
    ml: { base: "3", md: "4" },
    pl: { base: "4", md: "6" },
    pr: "6",
    py: "2",
    borderLeftWidth: "2px",
    borderLeftStyle: "solid",
    borderLeftColor: "border.subtle",
    bg: "surface.subtle",
    borderRadius: "md",
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
