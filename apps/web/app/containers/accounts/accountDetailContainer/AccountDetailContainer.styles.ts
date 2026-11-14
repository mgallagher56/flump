import { cva } from "@repo/ui/styled-system/css";

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

/** The one quiet link to the page that owns this account's detail ("See your mortgage"). */
export const ownerLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    minHeight: "touch",
    textStyle: "label.sm",
    fontWeight: "semibold",
    color: "primary",
    textDecoration: "none",
    borderRadius: "md",
    _hover: { textDecoration: "underline", textUnderlineOffset: "3px" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
