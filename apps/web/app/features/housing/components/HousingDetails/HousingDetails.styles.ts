import { sva } from "@repo/ui/styled-system/css";

export const housingDetails = sva({
  slots: ["root", "text", "form", "footer"],
  base: {
    root: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "3",
      flexWrap: "wrap",
      pb: "3",
    },
    text: { margin: "0", textStyle: "body.sm", color: "text.secondary", flex: "1 1 16rem" },
    form: { display: "flex", flexDirection: "column", gap: "4" },
    /** The one sheet footer (RC-12): primary full width above Cancel on a phone, in a row from sm. */
    footer: {
      display: "flex",
      flexDirection: { base: "column-reverse", sm: "row" },
      justifyContent: "flex-end",
      gap: "3",
      "& > *": { width: { base: "100%", sm: "auto" } },
    },
  },
});
