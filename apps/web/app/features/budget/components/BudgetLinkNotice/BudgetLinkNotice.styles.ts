import { sva } from "@repo/ui/styled-system/css";

/** One quiet note: secondary text on the card surface, each saved figure with its add button. */
export const budgetLinkNotice = sva({
  slots: ["root", "item", "text", "amount", "actions"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "3",
      textStyle: "body.sm",
      color: "text.secondary",
    },
    item: { display: "flex", flexDirection: "column", gap: "2" },
    text: { margin: "0", color: "text.primary" },
    amount: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
    actions: { display: "flex", flexWrap: "wrap", gap: "2" },
  },
});
