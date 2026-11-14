import { sva } from "@repo/ui/styled-system/css";

export const housingDetails = sva({
  slots: ["root", "text", "figure", "form"],
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
    figure: { fontVariantNumeric: "tabular-nums", fontWeight: "semibold", color: "text.primary" },
    form: { display: "flex", flexDirection: "column", gap: "4" },
  },
});
