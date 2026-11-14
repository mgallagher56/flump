import { sva } from "@repo/ui/styled-system/css";

export const stepFrameRecipe = sva({
  slots: ["root", "heading", "fields", "actions", "skip"],
  base: {
    root: { display: "flex", flexDirection: "column", gap: "5" },
    heading: {
      display: "flex",
      flexDirection: "column",
      gap: "1",
      // Focus lands here programmatically on each step change; show a ring only for keyboard focus.
      "& h2:focus:not(:focus-visible)": { outline: "none" },
      "& h2:focus-visible": {
        outline: "2px solid",
        outlineColor: "border.focusRing",
        outlineOffset: "2px",
        borderRadius: "sm",
      },
    },
    fields: { display: "flex", flexDirection: "column", gap: "5" },
    actions: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "3",
      mt: "2",
    },
    // A quiet text link on its own row, away from Next, so skipping never competes with it.
    skip: { display: "flex", justifyContent: "flex-end", mt: "-2" },
  },
});
