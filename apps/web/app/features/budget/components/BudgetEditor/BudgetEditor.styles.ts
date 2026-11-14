import { cva, sva } from "@repo/ui/styled-system/css";

/** The editor card: a heading, a quiet "saves as you go" line and one section per category. */
export const budgetEditor = sva({
  slots: ["root", "header", "title", "hint", "sections", "foot"],
  base: {
    // 16px on a phone so each entry fits two lines at 375; the card's usual 28px from md.
    root: { p: { base: "4", md: "7" } },
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

/**
 * An entry row in two lines on a phone (flex wrap): name and amount, then how often, the essential
 * switch and delete, each line sized on its own. One grid line from md: name, amount, how often,
 * essential, delete.
 */
export const entryRow = cva({
  base: {
    display: { base: "flex", md: "grid" },
    flexWrap: "wrap",
    gridTemplateColumns: { md: "minmax(0, 1fr) 140px 120px auto auto" },
    // A 4px gap on a phone so how often, essential and delete share the second line at 375.
    columnGap: { base: "1", md: "3" },
    rowGap: "2",
    alignItems: "center",
    py: "3",
    fontVariantNumeric: "tabular-nums",
    // The name: fills the first line beside the amount (104px plus the 4px gap) on a phone.
    "& > :first-child": {
      order: { base: 1, md: 0 },
      flex: { base: "1 1 calc(100% - 108px)", md: "none" },
      minWidth: 0,
    },
    "&:not(:last-child)": {
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
    },
  },
});

/** The amount, frequency and essential controls take their own places in the row. */
export const rowControls = cva({
  base: { display: "contents" },
});

export const amountField = cva({
  base: {
    order: { base: 2, md: 0 },
    width: { base: "104px", md: "100%" },
    fontVariantNumeric: "tabular-nums",
  },
});

export const frequencyField = cva({
  base: {
    order: { base: 3, md: 0 },
    // Its natural width on a phone, so "a month" and its arrow are never cut short.
    flexShrink: 0,
  },
});

export const essentialField = cva({
  // Its own width on a phone, so delete still fits at the end of the second line.
  base: {
    order: { base: 4, md: 0 },
    flex: { base: "0 0 auto", md: "none" },
    minWidth: { md: "120px" },
  },
});

export const removeCell = cva({
  base: {
    order: { base: 5, md: 0 },
    marginInlineStart: { base: "auto", md: "0" },
    justifySelf: "end",
  },
});

/** The add row closing each section: name, amount and the Add button. */
export const addRow = cva({
  base: {
    // Name on its own line on a phone, then amount, Add and Cancel; one line from md.
    display: "flex",
    flexWrap: "wrap",
    gap: "3",
    alignItems: "center",
    pt: "2",
    "& > :first-child": { flex: { base: "1 1 100%", md: "1 1 0" }, minWidth: 0 },
    fontVariantNumeric: "tabular-nums",
  },
});

export const addAmount = cva({
  base: {
    width: "140px",
    fontVariantNumeric: "tabular-nums",
  },
});

/** An amount inside running text, such as the remove confirmation. */
export const figure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
