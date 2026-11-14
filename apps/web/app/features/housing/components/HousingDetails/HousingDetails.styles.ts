import { sva } from "@repo/ui/styled-system/css";

export const housingDetails = sva({
  slots: ["root", "text", "link", "form"],
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
    link: {
      textStyle: "label.md",
      color: "primary",
      textDecoration: "underline",
      textUnderlineOffset: "3px",
      _focusVisible: {
        outline: "2px solid",
        outlineColor: "border.focusRing",
        outlineOffset: "2px",
        borderRadius: "sm",
      },
    },
    form: { display: "flex", flexDirection: "column", gap: "4" },
  },
});
