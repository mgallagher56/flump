import { sva } from "@repo/ui/styled-system/css";

/**
 * A quiet note under a category row: secondary text on the list's own surface, indented like the
 * opened entries so it reads as part of the row above it.
 */
export const accountLinkNotice = sva({
  slots: ["root", "entry", "text", "amount", "actions"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "2",
      pt: "1",
      pb: "3",
      pl: { base: "4", md: "9" },
      pr: { base: "0", md: "6" },
      textStyle: "body.sm",
      color: "text.secondary",
    },
    entry: { margin: "0", fontWeight: "semibold", color: "text.primary" },
    text: { margin: "0" },
    amount: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
    actions: { display: "flex", flexWrap: "wrap", gap: "2" },
  },
});
