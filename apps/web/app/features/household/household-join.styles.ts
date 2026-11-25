import { cva } from "@repo/ui/styled-system/css";

/** The join page (`routes/household.join._index.tsx`): one card, a reading width wide. */
export const joinCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    maxWidth: "32rem",
    width: "100%",
    marginInline: "auto",
  },
});

export const joinText = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const joinActions = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "3" },
});
