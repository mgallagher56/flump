import { cva } from "../../../styled-system/css";

export const dialogOverlayRecipe = cva({
  base: {
    position: "fixed",
    inset: 0,
    backgroundColor: "surface.scrim",
    zIndex: "modal",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: { base: "2.5", sm: "4" },
  },
});

export const dialogContentRecipe = cva({
  base: {
    backgroundColor: "surface.card",
    color: "text.primary",
    borderRadius: "xl",
    border: "1px solid",
    borderColor: "border",
    boxShadow: "overlay",
    width: "100%",
    maxHeight: { base: "94vh", md: "85vh" },
    overflowY: "auto",
    padding: { base: "5 4", sm: "6" },
    display: "flex",
    flexDirection: "column",
    gap: "4",
    outline: "none",
  },
  variants: {
    size: {
      sm: { maxWidth: "400px" },
      md: { maxWidth: "480px" },
      lg: { maxWidth: "640px" },
    },
  },
  defaultVariants: { size: "md" },
});

export const dialogHeaderRecipe = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "3",
  },
});

export const dialogTitleRecipe = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const dialogDescriptionRecipe = cva({
  base: { textStyle: "body.sm", color: "text.muted", marginTop: "1", marginBottom: 0 },
});

export const dialogCloseRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "44px",
    minHeight: "44px",
    margin: "-2.5",
    background: "none",
    border: "none",
    color: "text.muted",
    cursor: "pointer",
    borderRadius: "md",
    flexShrink: 0,
    _hover: { color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
