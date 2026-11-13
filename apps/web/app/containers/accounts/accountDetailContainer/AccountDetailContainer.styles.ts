import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: { base: "24px", md: "32px" },
    paddingBottom: "48px",
    minWidth: 0,
  },
});

export const backLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    width: "fit-content",
    color: "text.secondary",
    textStyle: "label.md",
    textDecoration: "none",
    borderRadius: "sm",
    _hover: { color: "primary", textDecoration: "underline" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const notFound = cva({
  base: { color: "text.secondary", textStyle: "body.md" },
});
