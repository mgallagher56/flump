import { sva } from "../../../styled-system/css";

export const emptyStateRecipe = sva({
  slots: ["root", "icon", "title", "description", "action"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "3",
      textAlign: "center",
      px: { base: "4", md: "8" },
      py: { base: "10", md: "14" },
      backgroundColor: "surface.subtle",
      borderWidth: "1px",
      borderStyle: "dashed",
      borderColor: "border.subtle",
      borderRadius: "xl",
    },
    icon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: "text.secondary",
      fontSize: "3xl",
    },
    title: {
      margin: 0,
      fontSize: "lg",
      fontWeight: "600",
      lineHeight: "1.3",
      color: "text.primary",
    },
    description: {
      margin: 0,
      maxWidth: "460px",
      fontSize: "sm",
      lineHeight: "1.6",
      color: "text.secondary",
    },
    action: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "2",
      mt: "2",
    },
  },
});
