import { sva } from "../../../styled-system/css";

export const emptyStateRecipe = sva({
  slots: ["root", "illustration", "icon", "title", "description", "action", "secondaryAction"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      borderWidth: "1px",
      borderStyle: "dashed",
      borderColor: "border.subtle",
      borderRadius: "xl",
    },
    illustration: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      maxWidth: "100%",
      color: "text.secondary",
      "& svg, & img": { maxWidth: "100%", height: "auto" },
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
      color: "text.primary",
    },
    description: {
      margin: 0,
      maxWidth: "460px",
      color: "text.secondary",
    },
    action: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: "2",
    },
    secondaryAction: {
      display: "inline-flex",
      alignItems: "center",
    },
  },
  variants: {
    tone: {
      default: {
        root: { backgroundColor: "surface.subtle" },
      },
      muted: {
        root: { backgroundColor: "transparent" },
        title: { color: "text.secondary" },
        description: { color: "text.muted" },
        icon: { color: "text.muted" },
        illustration: { color: "text.muted" },
      },
    },
    size: {
      md: {
        root: { gap: "3", px: { base: "4", md: "8" }, py: { base: "10", md: "14" } },
        title: { textStyle: "heading.md" },
        description: { textStyle: "body.md" },
        action: { gap: "2", mt: "2" },
      },
      sm: {
        root: { gap: "2", px: "4", py: "6" },
        title: { textStyle: "heading.sm" },
        description: { textStyle: "body.sm" },
        action: { gap: "2", mt: "1" },
      },
    },
  },
  defaultVariants: { tone: "default", size: "md" },
});
