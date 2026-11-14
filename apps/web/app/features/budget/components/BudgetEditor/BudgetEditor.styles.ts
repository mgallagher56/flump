import { cva, sva } from "@repo/ui/styled-system/css";

/** The editor card: a heading, a quiet "saves as you go" line and one section per category. */
export const budgetEditor = sva({
  slots: ["header", "title", "hint", "sections", "foot"],
  base: {
    header: { display: "flex", flexDirection: "column", gap: "1", mb: "4" },
    title: { margin: "0", textStyle: "heading.sm", color: "text.primary" },
    hint: { margin: "0", textStyle: "body.sm", color: "text.muted" },
    sections: { display: "flex", flexDirection: "column", gap: "6" },
    foot: {
      display: "flex",
      mt: "6",
      pt: "4",
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      borderTopColor: "border.subtle",
    },
  },
});

/** One category: its heading, its entry rows and the add row at the end. */
export const editorSection = sva({
  slots: ["root", "headingRow", "heading", "list", "empty"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "2",
      "&:not(:first-child)": {
        pt: "6",
        borderTopWidth: "1px",
        borderTopStyle: "solid",
        borderTopColor: "border.subtle",
      },
    },
    headingRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "3",
      flexWrap: "wrap",
    },
    heading: { margin: "0", textStyle: "label.md", color: "text.primary" },
    list: { listStyle: "none", margin: "0", p: "0" },
    empty: { margin: "0", textStyle: "body.sm", color: "text.muted" },
  },
});

/** An entry row: name, amount, frequency, essential switch and remove. Wraps on narrow screens. */
export const entryRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: {
      base: "minmax(0, 1fr) auto",
      md: "minmax(0, 1fr) 140px 120px auto auto",
    },
    gap: "3",
    alignItems: "center",
    py: "3",
    fontVariantNumeric: "tabular-nums",
    "&:not(:last-child)": {
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
    },
  },
});

/** The amount, frequency and essential controls; their own line on narrow screens. */
export const rowControls = cva({
  base: {
    display: { base: "flex", md: "contents" },
    flexWrap: "wrap",
    alignItems: "center",
    gap: "3",
    gridColumn: { base: "1 / -1", md: "auto" },
    gridRow: { base: 2, md: "auto" },
  },
});

export const amountField = cva({
  base: { width: { base: "140px", md: "100%" }, fontVariantNumeric: "tabular-nums" },
});

export const frequencyField = cva({
  base: { width: { base: "120px", md: "100%" } },
});

/** The add row closing each section: name, amount and the Add button. */
export const addRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr) auto", md: "minmax(0, 1fr) 140px auto" },
    gap: "3",
    alignItems: "center",
    pt: "2",
    fontVariantNumeric: "tabular-nums",
  },
});

export const addAmount = cva({
  base: {
    width: "140px",
    gridColumn: { base: "1 / 2", md: "auto" },
    gridRow: { base: 2, md: "auto" },
    fontVariantNumeric: "tabular-nums",
  },
});

/** An amount inside running text, such as the remove confirmation. */
export const figure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
