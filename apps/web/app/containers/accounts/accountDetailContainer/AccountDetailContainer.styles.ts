import { cva } from "@repo/ui/styled-system/css";

export const backLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
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

/**
 * Places the one quiet link to the page that owns this account's detail ("See your mortgage"). Its
 * look is the shared `Button variant="link"`; this only keeps it from stretching across the page.
 */
export const ownerLink = cva({
  base: { alignSelf: "flex-start" },
});

export const headerActions = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
  },
});
