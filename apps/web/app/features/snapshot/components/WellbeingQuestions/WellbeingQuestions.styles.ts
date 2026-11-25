import { cva } from "@repo/ui/styled-system/css";

/** The card: plain, no tint and no motion (M5), so it never draws attention to itself. */
export const questionsCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    padding: "4",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    minWidth: 0,
  },
});

export const questionsHeading = cva({
  base: { margin: 0, textStyle: "label.md", color: "text.primary" },
});

export const worseTextArea = cva({
  base: {
    display: "block",
    width: "100%",
    minWidth: 0,
    minHeight: "24",
    px: "density.controlPadX",
    py: "density.controlPadY",
    resize: "vertical",
    backgroundColor: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.input",
    borderRadius: "lg",
    color: "text.primary",
    textStyle: "body.md",
    _hover: { borderColor: "border.strong" },
    _focusVisible: {
      backgroundColor: "surface.card",
      borderColor: "border.focusRing",
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "1px",
    },
  },
});

export const questionsActions = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3" },
});

export const questionsThanks = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    // Empty, it leaves the layout but stays in the accessibility tree, so the region is heard when filled.
    _empty: { srOnly: true },
  },
});
