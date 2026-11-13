import { sva } from "../../../styled-system/css";

export const formFieldRecipe = sva({
  slots: ["root", "label", "required", "hint", "error", "errorText"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "1.5",
      minWidth: 0,
    },
    label: {
      textStyle: "label.md",
      color: "text.primary",
      fontWeight: "semibold",
    },
    required: {
      textStyle: "body.sm",
      fontWeight: "normal",
      color: "text.secondary",
      marginLeft: "2",
    },
    hint: {
      textStyle: "body.sm",
      color: "text.secondary",
      margin: 0,
    },
    error: {
      display: "flex",
      alignItems: "flex-start",
      gap: "1.5",
      textStyle: "body.sm",
      color: "status.danger.text",
      margin: 0,
    },
    errorText: {
      minWidth: 0,
    },
  },
});
