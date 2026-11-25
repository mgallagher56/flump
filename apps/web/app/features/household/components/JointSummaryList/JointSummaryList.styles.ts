import { cva } from "@repo/ui/styled-system/css";

export const summaryList = cva({
  base: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" },
});

export const summaryItem = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "4",
    paddingBlock: "3",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    _last: { borderBottomWidth: "0" },
  },
});

export const summaryName = cva({
  base: { textStyle: "body.md", color: "text.primary", margin: 0 },
});

export const summaryMeta = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

/** Balances: tabular figures, en-GB money from `Money`, no colour for good or bad. */
export const summaryBalance = cva({
  base: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
});

export const summaryText = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const summaryNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", marginTop: "3", marginBottom: 0 },
});
