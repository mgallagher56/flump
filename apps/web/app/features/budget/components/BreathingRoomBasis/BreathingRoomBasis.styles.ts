import { sva } from "@repo/ui/styled-system/css";

/**
 * What Breathing room counts (owner item 32b): a sentence saying what it is, then two cards, one
 * for the accounts and one for the spending, each with its own tile and heading, so the two read as
 * separate. Semantic tokens only, so both follow light and dark.
 */
export const breathingRoomBasis = sva({
  slots: [
    "root",
    "intro",
    "cards",
    "card",
    "cardHead",
    "cardTitle",
    "list",
    "item",
    "switchItem",
    "hint",
    "note",
    "empty",
    "link",
  ],
  base: {
    root: { minWidth: 0 },
    intro: { margin: "0", mb: "4", textStyle: "body.sm", color: "text.secondary" },
    cards: {
      display: "grid",
      gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
      gap: "4",
    },
    card: {
      display: "flex",
      flexDirection: "column",
      gap: "3",
      p: "4",
      bg: "surface.sunken",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "border.subtle",
      borderRadius: "lg",
      minWidth: 0,
    },
    cardHead: { display: "flex", alignItems: "center", gap: "3" },
    cardTitle: { margin: "0", textStyle: "label.md", color: "text.primary" },
    list: { listStyle: "none", margin: "0", p: "0", display: "flex", flexDirection: "column" },
    item: {
      display: "flex",
      justifyContent: "space-between",
      gap: "3",
      py: "2",
      textStyle: "body.sm",
      color: "text.primary",
      fontVariantNumeric: "tabular-nums",
      "&:not(:last-child)": {
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: "border.subtle",
      },
    },
    switchItem: {
      py: "2",
      "&:not(:last-child)": {
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: "border.subtle",
      },
    },
    hint: { fontVariantNumeric: "tabular-nums" },
    note: { margin: "0", textStyle: "body.sm", color: "text.muted" },
    empty: { margin: "0", textStyle: "body.sm", color: "text.muted" },
    link: {
      textStyle: "body.sm",
      color: "primary",
      fontWeight: "semibold",
      textDecoration: "underline",
      textUnderlineOffset: "3px",
    },
  },
});
